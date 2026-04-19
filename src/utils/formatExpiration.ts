export function formatExpiration(expOption: string, expValue: number): Date | null {
  const now = Date.now();

  switch (expOption) {
    case "EX":
      return new Date(now + expValue * 1000);
    case "PX":
      return new Date(now + expValue);
    case "EXAT":
      return new Date(expValue * 1000);
    case "PXAT":
      return new Date(expValue);
    default:
      return null;
  }
}
