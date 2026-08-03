# Brand parity: Web ↔ Mobile

Keep AutoCore identity consistent across Next.js web and Expo mobile.

## Shared tokens

| Role | Web (`globals.css`) | Mobile target |
|------|---------------------|---------------|
| Primary | `#0a73f2` / `#4d96ff` | Same hex in theme primary |
| Canvas light | `#f5f7fb` | Match surface background |
| Ink | `#11131a` | Match text primary |
| Muted | `#5a606c` | Match secondary text (≥ 4.5:1 on canvas) |
| Radius base | `0.625rem` | Map to theme radius scale |
| Type | Geist | Closest system / bundled sans already in Expo theme |

## UX follow-through (from MOBILE-UX-AUDIT)

Already addressed or verified:

- [x] Overview header binds avatar to session (`UserAvatar` + `useSession`)

Still open (track in mobile sprints):

- [ ] Search results must navigate or show disabled state (no dead taps)
- [ ] Remove scaffold routes (`two`, `modal`, design-system from production nav)
- [ ] Settings toggles that only look interactive must either wire behavior or be removed
- [ ] Onboarding: create-company path + email verify refresh
- [ ] Collapse duplicated profile/settings IA

## Download / desktop

Marketing download pages (`/download`, `/download/mobile`) must stay aligned with Tauri publish scripts (`tauri:publish-downloads`) and store listing copy.
