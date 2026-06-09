import { NextResponse } from "next/server";

import {
  buildAppleRedirectPayload,
  type AppleRedirectPayload,
} from "@/lib/auth/apple-js-redirect-payload";

function isDesktopShellUserAgent(userAgent: string): boolean {
  return /AutoCoreDesktop\//i.test(userAgent);
}

function buildLoginReturnPath(userAgent: string): string {
  const params = new URLSearchParams({ apple_js_return: "1" });
  if (isDesktopShellUserAgent(userAgent)) {
    params.set("desktop", "1");
  }
  return `/login?${params.toString()}`;
}

function buildAppleRedirectBridgeHtml(payload: AppleRedirectPayload, loginReturnPath: string): string {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  const loginReturnPathJson = JSON.stringify(loginReturnPath);

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Вход через Apple…</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #111; }
      p { font-size: 14px; opacity: 0.7; }
    </style>
  </head>
  <body>
    <p>Завершаем вход через Apple…</p>
    <script>
      (function () {
        var payload = ${serialized};
        var loginReturnPath = ${loginReturnPathJson};
        var storageKey = "autocore.appleRedirectPayload";

        function storePayload(target) {
          try {
            target.sessionStorage.setItem(storageKey, JSON.stringify(payload));
            return true;
          } catch (e) {
            return false;
          }
        }

        var opener = window.opener;
        if (opener && opener !== window && !opener.closed) {
          try {
            if (storePayload(opener)) {
              opener.location.replace(loginReturnPath);
              window.close();
              return;
            }
          } catch (e) {}
        }

        storePayload(window);
        window.location.replace(loginReturnPath);
      })();
    </script>
  </body>
</html>`;
}

/** Apple redirect mode (usePopup:false) POSTs id_token here — bridge into client sessionStorage. */
export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected application/x-www-form-urlencoded POST" }, { status: 400 });
  }

  const payload = buildAppleRedirectPayload(formData);
  if (!payload) {
    return NextResponse.json({ error: "Missing id_token in Apple redirect POST" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const loginReturnPath = buildLoginReturnPath(userAgent);

  return new NextResponse(buildAppleRedirectBridgeHtml(payload, loginReturnPath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
