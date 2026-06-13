/**
 * Send a test verification code email via Resend.
 *
 * Usage:
 *   npx tsx scripts/send-test-verification-email.ts victhewise@icloud.com
 */

import { createHash, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env.local") });

const VERIFICATION_EMAIL_SUBJECT = "Код подтверждения — AutoCore";
const CODE_TTL_MS = 15 * 60 * 1000;

function codePepper(): string {
  return (
    process.env.EMAIL_VERIFICATION_CODE_SECRET?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    "autocore-email-verification"
  );
}

function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

function hashVerificationCode(uid: string, code: string): string {
  return createHash("sha256").update(`${codePepper()}:${uid}:${code}`).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildVerificationCodeEmailHtml(params: {
  code: string;
  userName?: string | null;
}): string {
  const BRAND_PRIMARY = "#0a73f2";
  const BRAND_TEXT = "#11131a";
  const BRAND_MUTED = "#5c6370";
  const BRAND_BORDER = "#e8ecf2";
  const BRAND_SURFACE = "#ffffff";
  const BRAND_PAGE = "#f3f6fb";
  const supportEmail =
    process.env.NEXT_PUBLIC_AUTOCORE_SUPPORT_EMAIL?.trim() || "support@myautocore.com";

  const greeting = params.userName?.trim()
    ? `Здравствуйте, ${escapeHtml(params.userName.trim())}!`
    : "Здравствуйте!";
  const code = escapeHtml(params.code);
  const appUrl = escapeHtml(
    (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
  );

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>Код для подтверждения email</title>
  </head>
  <body bgcolor="${BRAND_PAGE}" style="margin:0;padding:48px 16px;background-color:${BRAND_PAGE} !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${BRAND_SURFACE}" style="max-width:520px;background-color:${BRAND_SURFACE} !important;border:1px solid ${BRAND_BORDER};border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(17,19,26,0.08);">
            <tr><td style="height:4px;background:linear-gradient(90deg,${BRAND_PRIMARY},#4d9bff);">&nbsp;</td></tr>
            <tr>
              <td style="padding:36px 36px 8px;">
                <div style="font-size:17px;font-weight:700;color:${BRAND_TEXT};">AutoCore</div>
                <div style="font-size:12px;color:${BRAND_MUTED};margin-top:2px;">Подтверждение аккаунта</div>
                <h1 style="margin:24px 0 0;font-size:26px;color:${BRAND_TEXT};">Код для подтверждения email</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 36px;color:${BRAND_TEXT};font-size:15px;line-height:1.7;">
                <p style="margin:0 0 16px;">${greeting}</p>
                <p style="margin:0 0 24px;">Введите код ниже в AutoCore, чтобы подтвердить email.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td align="center" style="padding:24px 16px;border-radius:16px;background:#f5f8fd;border:1px solid ${BRAND_BORDER};">
                      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_MUTED};">Код подтверждения</p>
                      <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.28em;color:${BRAND_TEXT};font-family:monospace;">${code}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;color:${BRAND_MUTED};">Код действует 15 минут.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px 28px;border-top:1px solid ${BRAND_BORDER};background:#f8fafd;">
                <p style="margin:0;font-size:12px;color:${BRAND_MUTED};">
                  Вопросы? <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND_PRIMARY};">${escapeHtml(supportEmail)}</a>
                </p>
                <p style="margin:8px 0 0;font-size:11px;color:#9aa3b2;"><a href="${appUrl}" style="color:#9aa3b2;">${appUrl}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function initAdmin() {
  if (getApps().length > 0) return;

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!path) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
  }

  const serviceAccount = JSON.parse(readFileSync(resolve(path), "utf8")) as Record<string, unknown>;
  initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npx tsx scripts/send-test-verification-email.ts <email>");
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_NOREPLY_EMAIL?.trim() || "AutoCore <noreply@myautocore.com>";
  if (!resendKey) {
    throw new Error("RESEND_API_KEY is not set in .env.local");
  }

  initAdmin();
  const adminAuth = getAuth();
  const db = getFirestore();

  const user = await adminAuth.getUserByEmail(email);
  const code = generateVerificationCode();

  await db.collection("users").doc(user.uid).set(
    {
      emailVerificationCodeHash: hashVerificationCode(user.uid, code),
      emailVerificationCodeExpiresAt: Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
      emailVerificationCodeAttempts: 0,
    },
    { merge: true },
  );

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from,
    to: email,
    subject: VERIFICATION_EMAIL_SUBJECT,
    html: buildVerificationCodeEmailHtml({
      code,
      userName: user.displayName,
    }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log(`Verification code email sent to ${email}`);
  console.log(`Resend id: ${result.data?.id ?? "unknown"}`);
  console.log(`Code (dev only): ${code}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
