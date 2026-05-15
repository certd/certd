export function calcNextSuiteCountUsed(used: number, oldCount: number, newCount: number) {
  return (used ?? 0) - (oldCount ?? 0) + (newCount ?? 0);
}
