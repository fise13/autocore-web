/** Items stringified to estimate a catalog's size before serialising all of it. */
const SIZE_SAMPLE = 40;

/**
 * Cheap "is this array too big to persist?" check from an evenly spread sample.
 *
 * The snapshot cache used to stringify the whole catalog on every realtime
 * change just to learn the result was over its size limit — tens of megabytes
 * per edit for a 10,000-motor yard, on the JS thread. Pure, for node tests.
 */
export function likelyExceedsPersistLimit(data: unknown, limitChars: number): boolean {
  if (!Array.isArray(data) || data.length <= SIZE_SAMPLE) return false;
  const step = Math.floor(data.length / SIZE_SAMPLE);
  let sampleChars = 0;
  for (let index = 0; index < SIZE_SAMPLE; index += 1) {
    try {
      sampleChars += JSON.stringify(data[index * step])?.length ?? 0;
    } catch {
      return false;
    }
  }
  return (sampleChars / SIZE_SAMPLE) * data.length > limitChars;
}
