/**
 * Cold-start handoff: splash lockup rises into the login brand slot.
 * Login chrome reads this so the mark is already painted underneath
 * (no second fade-in) when the overlay clears.
 *
 * Sticky until cleared — survives React Strict Mode remounts.
 */
let loginRiseHandoff = false;

export function armLoginRiseHandoff(): void {
  loginRiseHandoff = true;
}

/** Whether the current cold start should hand off into the login mark. */
export function takeLoginRiseHandoff(): boolean {
  return loginRiseHandoff;
}

/** Call when the splash overlay is fully dismissed. */
export function clearLoginRiseHandoff(): void {
  loginRiseHandoff = false;
}
