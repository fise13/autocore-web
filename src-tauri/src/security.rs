//! Navigation policy for the desktop shell.
//!
//! The shell hosts a remote origin, so it is the only thing standing between a
//! link and a trusted webview that holds the user's Firebase session and can
//! reach native commands. Every URL is classified here before it is allowed to
//! load anywhere.
//!
//! Host matching is suffix-anchored. The previous implementation used
//! `host.contains("apple.com")`, which also accepts `apple.com.attacker.example`
//! and would have opened an attacker page in a window we own.

use url::Url;

use crate::config;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UrlKind {
    /// The AutoCore product itself — may load in the main window.
    Product,
    /// An identity provider mid-handshake — may load in a popup we own.
    AuthPopup,
    /// Everything else — belongs in the user's own browser.
    External,
}

/// Registrable domains that serve the AutoCore product.
const PRODUCT_DOMAINS: &[&str] = &["myautocore.com"];

/// Identity providers Firebase hands the OAuth handshake to. `firebaseapp.com`
/// covers the Firebase auth handler (`<project>.firebaseapp.com`), which is what
/// reads the provider response back into the SDK.
const AUTH_DOMAINS: &[&str] = &[
    "appleid.apple.com",
    "idmsa.apple.com",
    "accounts.google.com",
    "firebaseapp.com",
    "identitytoolkit.googleapis.com",
];

/// `host == domain` or `host` is a subdomain of `domain`. Never a substring
/// match: `evil-myautocore.com` and `myautocore.com.evil.net` are both rejected.
fn host_matches(host: &str, domain: &str) -> bool {
    host == domain || host.strip_suffix(domain).is_some_and(|rest| rest.ends_with('.'))
}

fn matches_any(host: &str, domains: &[&str]) -> bool {
    domains.iter().any(|domain| host_matches(host, domain))
}

fn is_loopback(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "[::1]" | "::1")
}

/// Schemes the webview uses internally: `blob:` backs the PDF print frame,
/// `data:` backs generated QR images, and `tauri:`/`about:` are runtime
/// plumbing. None of them are navigations to a foreign origin, so they are not
/// this module's business.
pub fn is_internal_scheme(url: &Url) -> bool {
    matches!(url.scheme(), "blob" | "data" | "about" | "tauri" | "file")
        || url.host_str().is_some_and(|host| host.ends_with("tauri.localhost"))
}

/// Classify a URL against the origin this binary was built for.
pub fn classify(url: &Url) -> UrlKind {
    let Some(host) = url.host_str() else {
        return UrlKind::External;
    };
    let host = host.to_ascii_lowercase();

    // A debug build points at a local Next.js server, which is plain http.
    // Release builds only ever trust https.
    let scheme_ok = url.scheme() == "https" || (cfg!(debug_assertions) && url.scheme() == "http");
    if !scheme_ok {
        return UrlKind::External;
    }

    let is_configured_host = config::app_host().is_ok_and(|app_host| app_host == host);
    let is_dev_host = cfg!(debug_assertions) && is_loopback(&host);

    if is_configured_host || is_dev_host || matches_any(&host, PRODUCT_DOMAINS) {
        return UrlKind::Product;
    }

    if matches_any(&host, AUTH_DOMAINS) {
        return UrlKind::AuthPopup;
    }

    UrlKind::External
}

/// Rebuild a `autocore://host/path?query` deep link as a product URL.
///
/// Only the path, query and fragment survive; the origin always comes from the
/// build-time config. The scheme's "host" is treated as the first path segment,
/// because `autocore://auth/callback` parses with `auth` as the host.
pub fn deep_link_to_product_url(link: &Url) -> Result<Url, String> {
    if !link.scheme().eq_ignore_ascii_case(config::DEEP_LINK_SCHEME) {
        return Err(format!("Not an {} link: {link}", config::DEEP_LINK_SCHEME));
    }

    let mut target = config::app_origin()?;
    let head = link.host_str().unwrap_or_default();
    let tail = link.path();
    let path = format!("/{}{}", head.trim_matches('/'), tail);

    target.set_path(path.trim_end_matches('/'));
    target.set_query(link.query());
    target.set_fragment(link.fragment());
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(raw: &str) -> Url {
        raw.parse().expect("valid url")
    }

    #[test]
    fn product_hosts_are_recognised() {
        assert_eq!(classify(&url("https://app.myautocore.com/work")), UrlKind::Product);
        assert_eq!(classify(&url("https://myautocore.com/pricing")), UrlKind::Product);
    }

    #[test]
    fn lookalike_hosts_are_external() {
        // The bug this module exists to prevent.
        assert_eq!(classify(&url("https://myautocore.com.evil.net/")), UrlKind::External);
        assert_eq!(classify(&url("https://evil-myautocore.com/")), UrlKind::External);
        assert_eq!(classify(&url("https://appleid.apple.com.evil.net/")), UrlKind::External);
        assert_eq!(classify(&url("https://notapple.com/")), UrlKind::External);
    }

    #[test]
    fn identity_providers_are_popups() {
        assert_eq!(classify(&url("https://appleid.apple.com/auth")), UrlKind::AuthPopup);
        assert_eq!(classify(&url("https://accounts.google.com/o/oauth2/v2/auth")), UrlKind::AuthPopup);
        assert_eq!(classify(&url("https://autocore-6066c.firebaseapp.com/__/auth/handler")), UrlKind::AuthPopup);
    }

    #[test]
    fn unrelated_sites_are_external() {
        assert_eq!(classify(&url("https://stripe.com/billing")), UrlKind::External);
        assert_eq!(classify(&url("https://github.com/")), UrlKind::External);
    }

    #[test]
    fn deep_links_keep_only_path_and_query() {
        let expected_host = config::app_host().unwrap();
        let resolved = deep_link_to_product_url(&url("autocore://auth/callback?code=abc")).unwrap();
        assert_eq!(resolved.host_str(), Some(expected_host.as_str()));
        assert_eq!(resolved.path(), "/auth/callback");
        assert_eq!(resolved.query(), Some("code=abc"));
    }

    #[test]
    fn deep_links_cannot_smuggle_a_foreign_origin() {
        let expected_host = config::app_host().unwrap();
        let resolved = deep_link_to_product_url(&url("autocore://evil.example/steal")).unwrap();
        // `evil.example` becomes a path segment, never the host.
        assert_eq!(resolved.host_str(), Some(expected_host.as_str()));
        assert_eq!(resolved.path(), "/evil.example/steal");
        assert_eq!(classify(&resolved), UrlKind::Product);
    }
}
