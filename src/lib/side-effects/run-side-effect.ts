/**
 * Run a non-critical follow-up (notify, activity, extract) without failing the
 * primary write. Failures are always structured-logged so they are visible in
 * Vercel/Firebase logs instead of disappearing into `.catch(() => undefined)`.
 */
export async function runSideEffect(
  name: string,
  task: () => Promise<unknown>,
  context: Record<string, unknown> = {},
): Promise<void> {
  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[side-effect:${name}] failed`, {
      ...context,
      message,
      error,
    });
  }
}
