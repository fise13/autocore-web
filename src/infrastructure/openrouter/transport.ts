/**
 * How a runtime reaches OpenRouter.
 *
 * - Local: `OPENROUTER_API_KEY` (or `NVIDIA_OPENROUTER_API_KEY` for the Core
 *   lane) in `.env.local` → direct `https://openrouter.ai/api/v1`.
 * - Production: no key on Vercel; the Firebase proxy holds it and is reached
 *   with an Admin-minted Google ID token (or the optional `AI_PROXY_SECRET`).
 *
 * Kept in its own module — with no `server-only` import — so both the JSON and
 * the streaming transports can share the type without a circular import.
 */
export type AiTransport =
  | { kind: "direct"; apiKey: string }
  | { kind: "proxy"; url: string; secret: string | null };
