export function encodeNull(): string {
  return `$-1\r\n`;
}

export function encodeSimple(s: string): string {
  return `+${s}\r\n`;
}

export function encodeBulk(s: string): string {
  if (s.length === 0) {
    return encodeNull();
  }
  return `\$${s.length}\r\n${s}\r\n`;
}
