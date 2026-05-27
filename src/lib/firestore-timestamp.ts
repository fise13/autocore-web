import { Timestamp } from "firebase/firestore";

export function toDateFromFirestore(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      return candidate.toDate.call(value);
    }
  }
  return undefined;
}
