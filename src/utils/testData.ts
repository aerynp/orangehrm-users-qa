/**
 * Test data helpers.
 *
 * This is a SHARED public demo - other people (and other CI runs) are
 * hitting the same dataset concurrently. Every value that must be unique
 * (usernames especially) is derived from a high-resolution timestamp plus a
 * short random suffix so two runs started in the same millisecond still
 * can't collide.
 */

/** Builds a username that is (practically) guaranteed unique for this run. */
export function uniqueUsername(prefix = 'auto'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${timestamp}_${randomSuffix}`;
}

/** A password that satisfies OrangeHRM's complexity rule (upper+lower+digit, 7+ chars). */
export function validPassword(): string {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `Auto${randomSuffix}9!`;
}
