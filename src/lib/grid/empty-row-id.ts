let emptyRowSequence = 0;

export function nextEmptyRowId(): string {
  emptyRowSequence += 1;
  return `empty-${emptyRowSequence}`;
}

export function resetEmptyRowSequence(start = 0) {
  emptyRowSequence = start;
}
