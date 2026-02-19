function loc(line: number, value?: string) {
  return `at line ${line}${value !== undefined ? ` (${JSON.stringify(value)})` : ""}`;
}

function expectLine(lines: string[], index: number, context: string): string {
  const line = lines[index];
  if (!line) {
    throw new Error(`Unexpected end of input ${loc(index)} while ${context}`);
  }

  return line;
}

function parseBulkString(
  lines: string[],
  startLine: number,
  elementIndex: number
): { value: string; nextLine: number } {
  const lengthLine = expectLine(lines, startLine, `expecting bulk string length for element ${elementIndex}`);

  if (!lengthLine.startsWith("$")) {
    throw new Error(
      `Invalid bulk string header ${loc(elementIndex, lengthLine)}: expected '$<length>' for element ${elementIndex}`
    );
  }

  const length = Number(lengthLine.slice(1));
  if (!Number.isInteger(length) || length < 0) {
    throw new Error(`Invalid bulk string length ${loc(elementIndex, lengthLine)}: expected non-negative integer`);
  }

  const valueLine = expectLine(lines, startLine + 1, `reading bulk string data for element ${elementIndex}`);
  if (valueLine.length !== length) {
    throw new Error(
      `Bulk string length mismatch ${loc(startLine + 1, valueLine)}: expected ${length} bytes, got ${valueLine.length}`
    );
  }

  return { value: valueLine, nextLine: startLine + 2 };
}

function parseRespCommand(lines: string[], startLine: number) {
  const header = expectLine(lines, startLine, "expecting RESP array");

  const arrSize = Number(header.slice(1));
  if (!Number.isInteger(arrSize) || arrSize < 0) {
    throw new Error(`Invalid RESP array size ${loc(startLine, header)}: expected non-negative integer`);
  }

  const cmd: string[] = [];
  let lineIndex = startLine + 1;

  for (let i = 0; i < arrSize; i++) {
    const result = parseBulkString(lines, lineIndex, i);
    cmd.push(result.value);
    lineIndex = result.nextLine;
  }

  return { cmd, nextLine: lineIndex };
}

export function decodeCommands(data: string) {
  const commands: string[][] = [];
  const lines = data.split("\r\n");

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    if (!lines[lineIndex]) break;

    const { cmd, nextLine } = parseRespCommand(lines, lineIndex);
    commands.push(cmd);
    lineIndex = nextLine;
  }

  return commands;
}
