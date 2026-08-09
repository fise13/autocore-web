/**
 * Renders every transactional email template with sample data.
 *
 * Shared by `preview-emails.mjs` (writes files for visual QA) and `send-preview.mjs`
 * (delivers one of them through Resend), so both always exercise the real builders.
 */

const SAMPLE_CODE = "482917";
const SAMPLE_NAME = "Victor";

export async function buildSamples({ recipientEmail = "you@example.com" } = {}) {
  const [codeEmail, verifyEmail, resetEmail, inviteEmail] = await Promise.all([
    import("../../src/lib/email/templates/verification-code-email.ts"),
    import("../../src/lib/email/templates/verification-email.ts"),
    import("../../src/lib/email/templates/password-reset-email.ts"),
    import("../../src/lib/email/templates/invite-email.ts"),
  ]);

  const expiresAt = new Date("2026-08-12T09:30:00.000Z");

  return [
    {
      key: "verification-code",
      label: "Verification code",
      message: codeEmail.buildVerificationCodeEmail({
        code: SAMPLE_CODE,
        userName: SAMPLE_NAME,
        recipientEmail,
      }),
    },
    {
      key: "verification-link",
      label: "Verify email (link)",
      message: verifyEmail.buildVerificationEmail({
        verifyUrl: "https://app.myautocore.com/auth/action?mode=verifyEmail&oobCode=sample-token",
        userName: SAMPLE_NAME,
        recipientEmail,
      }),
    },
    {
      key: "password-reset",
      label: "Password reset",
      message: resetEmail.buildPasswordResetEmail({
        resetUrl: "https://app.myautocore.com/auth/action?mode=resetPassword&oobCode=sample-token",
        userName: SAMPLE_NAME,
        recipientEmail,
      }),
    },
    {
      key: "invite",
      label: "Team invitation",
      message: inviteEmail.buildInviteEmail({
        joinUrl: "https://app.myautocore.com/invite/sample-token",
        companyName: "Nord Motors",
        role: "manager",
        invitedByName: "Victor",
        expiresAt,
        recipientEmail,
      }),
    },
  ];
}
