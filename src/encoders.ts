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

export function encodeArray(arr: string[]): string {
  let result = `*${arr.length}\r\n`;
  for (const s of arr) {
    result += `\$${s.length}\r\n${s}\r\n`;
  }

  return result;
}

export function encodeError(s: string): string {
  return `-${s}\r\n`;
}
