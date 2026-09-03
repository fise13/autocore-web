use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<SignInWithApple<R>> {
    Ok(SignInWithApple(app.clone()))
}

/// Access to the sign-in-with-apple APIs.
pub struct SignInWithApple<R: Runtime>(AppHandle<R>);

impl<R: Runtime> SignInWithApple<R> {
    pub async fn get_apple_id_credential(
        &self,
        payload: AppleIDAuthorizationRequest,
    ) -> crate::Result<AppleIDAuthorizationResponse> {
        #[cfg(target_os = "macos")]
        {
            macos::get_apple_id_credential(self.0.clone(), payload).await
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = payload;
            Err(crate::Error::UnsupportedPlatformError)
        }
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{mpsc, Arc};
    use std::time::Duration;

    use tauri::webview::PageLoadEvent;
    use tauri::{AppHandle, Manager, Runtime, Url, WebviewUrl, WebviewWindowBuilder, WindowEvent};

    use crate::models::*;
    use crate::Error;
    use serde_json::Value;

    const SERVICES_ID: &str = "com.wise.autocore.web";
    const REDIRECT_URI: &str = "https://app.myautocore.com/login";
    const WINDOW_LABEL: &str = "apple-siwa";
    const SAFARI_UA: &str =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 AutoCoreDesktop/0.1.0";

    pub async fn get_apple_id_credential<R: Runtime>(
        app: AppHandle<R>,
        payload: AppleIDAuthorizationRequest,
    ) -> crate::Result<AppleIDAuthorizationResponse> {
        if let Some(existing) = app.get_webview_window(WINDOW_LABEL) {
            let _ = existing.close();
        }

        let authorize_url = authorize_url(&payload).map_err(Error::MacOS)?;
        let expected_state = payload.state.clone();
        let (tx, rx) = mpsc::channel::<crate::Result<AppleIDAuthorizationResponse>>();
        let done = Arc::new(AtomicBool::new(false));
        let send: Arc<dyn Fn(crate::Result<AppleIDAuthorizationResponse>) + Send + Sync> = {
            let tx = tx.clone();
            let done = done.clone();
            Arc::new(move |result: crate::Result<AppleIDAuthorizationResponse>| {
                if done.swap(true, Ordering::SeqCst) {
                    return;
                }
                let _ = tx.send(result);
            })
        };

        let send_nav = send.clone();
        let state_nav = expected_state.clone();
        let send_load = send.clone();
        let state_load = expected_state.clone();

        let window = WebviewWindowBuilder::new(&app, WINDOW_LABEL, WebviewUrl::External(authorize_url))
            .title("Sign in with Apple")
            .inner_size(520.0, 720.0)
            .min_inner_size(420.0, 560.0)
            .center()
            .focused(true)
            .user_agent(SAFARI_UA)
            .initialization_script(
                r#"
                try {
                  if (/id_token=/.test(String(location.href))) {
                    document.documentElement.innerHTML =
                      '<body style="font:14px system-ui;display:grid;place-items:center;height:100vh;margin:0">Signing in…</body>';
                  }
                } catch (e) {}
                "#,
            )
            .on_navigation(move |url| {
                if let Some(response) = parse_callback(url, state_nav.as_deref()) {
                    send_nav(Ok(response));
                    return false;
                }
                is_allowed_host(url)
            })
            .on_page_load(move |window, payload| {
                if payload.event() != PageLoadEvent::Finished {
                    return;
                }
                if let Some(response) = parse_callback(payload.url(), state_load.as_deref()) {
                    send_load(Ok(response));
                    let _ = window.close();
                    return;
                }
                if !is_callback_host(payload.url()) {
                    return;
                }
                let send_eval = send_load.clone();
                let expected = state_load.clone();
                let _ = window.eval_with_callback("String(location.href)", move |json| {
                    let href = unwrap_eval_string(&json);
                    if let Ok(url) = Url::parse(&href) {
                        if let Some(response) = parse_callback(&url, expected.as_deref()) {
                            send_eval(Ok(response));
                        }
                    }
                });
            })
            .build()
            .map_err(|error| Error::MacOS(error.to_string()))?;

        let send_close = send.clone();
        window.on_window_event(move |event| {
            if matches!(event, WindowEvent::Destroyed) {
                send_close(Err(Error::MacOS("user_cancelled_authorize".into())));
            }
        });

        drop(send);
        drop(tx);

        let recv = tauri::async_runtime::spawn_blocking(move || rx.recv_timeout(Duration::from_secs(180)))
            .await
            .map_err(|error| Error::MacOS(error.to_string()))?;

        let _ = window.close();

        match recv {
            Ok(result) => result,
            Err(_) => Err(Error::MacOS(
                "Sign in with Apple timed out waiting for the Apple window.".into(),
            )),
        }
    }

    fn authorize_url(payload: &AppleIDAuthorizationRequest) -> Result<Url, String> {
        let mut url =
            Url::parse("https://appleid.apple.com/auth/authorize").map_err(|error| error.to_string())?;
        {
            let mut query = url.query_pairs_mut();
            query.append_pair("client_id", SERVICES_ID);
            query.append_pair("redirect_uri", REDIRECT_URI);
            query.append_pair("response_type", "code id_token");
            // Fragment callbacks can be read from the URL. `name`/`email` scopes
            // force `form_post`, which this window cannot intercept.
            query.append_pair("response_mode", "fragment");
            if let Some(nonce) = payload.nonce.as_deref().filter(|value| !value.is_empty()) {
                query.append_pair("nonce", nonce);
            }
            if let Some(state) = payload.state.as_deref().filter(|value| !value.is_empty()) {
                query.append_pair("state", state);
            }
        }
        Ok(url)
    }

    fn is_callback_host(url: &Url) -> bool {
        matches!(
            url.host_str().map(|host| host.to_ascii_lowercase()).as_deref(),
            Some("app.myautocore.com" | "myautocore.com")
        ) && (url.path().starts_with("/login") || url.path().starts_with("/api/auth/apple-redirect"))
    }

    fn is_allowed_host(url: &Url) -> bool {
        let Some(host) = url.host_str() else {
            return false;
        };
        let host = host.to_ascii_lowercase();
        host == "appleid.apple.com"
            || host.ends_with(".appleid.apple.com")
            || host == "idmsa.apple.com"
            || host.ends_with(".idmsa.apple.com")
            || host == "apple.com"
            || host.ends_with(".apple.com")
            || host == "app.myautocore.com"
            || host == "myautocore.com"
            || host.ends_with(".myautocore.com")
    }

    fn parse_callback(
        url: &Url,
        expected_state: Option<&str>,
    ) -> Option<AppleIDAuthorizationResponse> {
        if !is_callback_host(url) {
            return None;
        }
        let mut params = HashMap::new();
        if let Some(fragment) = url.fragment() {
            params.extend(decode_params(fragment));
        }
        for (key, value) in url.query_pairs() {
            params.entry(key.into_owned()).or_insert_with(|| value.into_owned());
        }
        let id_token = params.get("id_token")?.trim().to_string();
        if id_token.is_empty() {
            return None;
        }
        if let (Some(expected), Some(returned)) = (expected_state, params.get("state")) {
            if expected != returned {
                return None;
            }
        }
        let jwt = decode_jwt_payload(&id_token);
        Some(AppleIDAuthorizationResponse {
            user_identifier: jwt
                .get("sub")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            given_name: None,
            family_name: None,
            email: jwt
                .get("email")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            authorization_code: params.get("code").cloned().unwrap_or_default(),
            identity_token: Some(id_token),
            state: params.get("state").cloned(),
        })
    }

    fn decode_params(raw: &str) -> HashMap<String, String> {
        let mut params = HashMap::new();
        for pair in raw.split('&') {
            let mut parts = pair.splitn(2, '=');
            let key = percent_decode(parts.next().unwrap_or(""));
            let value = percent_decode(&parts.next().unwrap_or("").replace('+', " "));
            if !key.is_empty() {
                params.insert(key, value);
            }
        }
        params
    }

    fn percent_decode(raw: &str) -> String {
        let bytes = raw.as_bytes();
        let mut out = Vec::with_capacity(bytes.len());
        let mut index = 0;
        while index < bytes.len() {
            if bytes[index] == b'%' && index + 2 < bytes.len() {
                if let Ok(byte) = u8::from_str_radix(
                    std::str::from_utf8(&bytes[index + 1..index + 3]).unwrap_or(""),
                    16,
                ) {
                    out.push(byte);
                    index += 3;
                    continue;
                }
            }
            out.push(bytes[index]);
            index += 1;
        }
        String::from_utf8_lossy(&out).into_owned()
    }

    fn decode_jwt_payload(jwt: &str) -> Value {
        let payload = jwt.split('.').nth(1).unwrap_or("");
        let mut b64 = payload.replace('-', "+").replace('_', "/");
        while b64.len() % 4 != 0 {
            b64.push('=');
        }
        let Ok(bytes) = base64_decode(&b64) else {
            return Value::Null;
        };
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    }

    fn base64_decode(raw: &str) -> Result<Vec<u8>, ()> {
        fn val(byte: u8) -> Option<u8> {
            match byte {
                b'A'..=b'Z' => Some(byte - b'A'),
                b'a'..=b'z' => Some(byte - b'a' + 26),
                b'0'..=b'9' => Some(byte - b'0' + 52),
                b'+' => Some(62),
                b'/' => Some(63),
                b'=' => Some(0),
                _ => None,
            }
        }
        let bytes = raw.as_bytes();
        let mut out = Vec::new();
        let mut index = 0;
        while index + 3 < bytes.len() {
            let a = val(bytes[index]).ok_or(())?;
            let b = val(bytes[index + 1]).ok_or(())?;
            let c = val(bytes[index + 2]).ok_or(())?;
            let d = val(bytes[index + 3]).ok_or(())?;
            out.push((a << 2) | (b >> 4));
            if bytes[index + 2] != b'=' {
                out.push((b << 4) | (c >> 2));
            }
            if bytes[index + 3] != b'=' {
                out.push((c << 6) | d);
            }
            index += 4;
        }
        Ok(out)
    }

    fn unwrap_eval_string(json: &str) -> String {
        serde_json::from_str::<String>(json).unwrap_or_else(|_| json.trim_matches('"').to_string())
    }
}
