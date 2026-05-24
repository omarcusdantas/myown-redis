import { encodeBulk, encodeError, encodeNull } from "../protocol/encode.js";

import type { KeyValueStore } from "../types.js";

type StreamEntry = [string, string[]];
type StreamResult = [string, StreamEntry[]];
type StreamQuery = [string, number, number];
interface ParsedStreamId {
  timestamp: number;
  sequence: number;
  autoSequence: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOrCreateStream(streamKey: string, kvStore: KeyValueStore) {
  if (!kvStore.has(streamKey)) {
    kvStore.set(streamKey, {
      type: "stream",
      value: "",
      expiration: null,
      stream: {
        first: [0, 0],
        last: [0, 0],
        entries: new Map(),
      },
    });
  }

  return kvStore.get(streamKey);
}

function parseStreamId(id: string): ParsedStreamId {
  if (id === "*") {
    return {
      timestamp: Date.now(),
      sequence: 0,
      autoSequence: true,
    };
  }

  const [timestampPart = "0", sequencePart] = id.split("-");

  return {
    timestamp: parseInt(timestampPart, 10),
    sequence: sequencePart !== undefined && sequencePart !== "*" ? parseInt(sequencePart, 10) : 0,
    autoSequence: sequencePart === "*",
  };
}

function resolveSequence(
  parsedId: ParsedStreamId,
  lastTimestamp: number,
  lastSequence: number
): number {
  if (!parsedId.autoSequence) return parsedId.sequence;
  if (parsedId.timestamp === lastTimestamp) return lastSequence + 1;
  return 0;
}

function validateStreamId(
  timestamp: number,
  sequence: number,
  lastTimestamp: number,
  lastSequence: number
): string | null {
  if (timestamp === 0 && sequence === 0) {
    return "ERR The ID specified in XADD must be greater than 0-0";
  }

  const isNotGreater =
    timestamp < lastTimestamp || (timestamp === lastTimestamp && sequence <= lastSequence);
  if (isNotGreater) {
    return "ERR The ID specified in XADD is equal or smaller than the target stream top item";
  }

  return null;
}

function initializeFirstEntry(
  stream: {
    first: [number, number];
    last: [number, number];
  },
  timestamp: number,
  sequence: number
): void {
  const isEmpty = stream.last[0] === 0 && stream.last[1] === 0;
  if (!isEmpty) return;

  stream.first[0] = timestamp;
  stream.first[1] = sequence;
}

function appendStreamEntry(
  stream: {
    last: [number, number];
    entries: Map<number, Map<number, string[]>>;
  },
  timestamp: number,
  sequence: number,
  fields: string[]
): void {
  stream.last[0] = timestamp;
  stream.last[1] = sequence;

  if (!stream.entries.has(timestamp)) {
    stream.entries.set(timestamp, new Map());
  }
  stream.entries.get(timestamp)?.set(sequence, fields);
}

function parseRangeBoundary(
  value: string,
  fallback: [number, number],
  isEnd = false
): [number, number] {
  if (value === "-" || value === "+") return fallback;
  const [timestampPart = "0", sequencePart] = value.split("-");

  return [
    parseInt(timestampPart, 10),
    sequencePart !== undefined ? parseInt(sequencePart, 10) : isEnd ? Infinity : 0,
  ];
}

function isWithinRange(
  timestamp: number,
  sequence: number,
  startTimestamp: number,
  startSequence: number,
  endTimestamp: number,
  endSequence: number
): boolean {
  const afterStart =
    timestamp > startTimestamp || (timestamp === startTimestamp && sequence >= startSequence);
  const beforeEnd =
    timestamp < endTimestamp || (timestamp === endTimestamp && sequence <= endSequence);

  return afterStart && beforeEnd;
}

function collectRangeEntries(
  stream: {
    entries: Map<number, Map<number, string[]>>;
  },
  startTimestamp: number,
  startSequence: number,
  endTimestamp: number,
  endSequence: number
): StreamEntry[] {
  const result: StreamEntry[] = [];

  for (const [timestamp, sequences] of stream.entries) {
    if (timestamp < startTimestamp || timestamp > endTimestamp) continue;

    for (const [sequence, fields] of sequences) {
      if (
        isWithinRange(timestamp, sequence, startTimestamp, startSequence, endTimestamp, endSequence)
      ) {
        result.push([`${timestamp}-${sequence}`, fields]);
      }
    }
  }

  return result;
}

function encodeStreamEntries(entries: StreamEntry[]): string {
  let encoded = `*${entries.length}\r\n`;

  for (const [id, fields] of entries) {
    encoded += `*2\r\n$${id.length}\r\n${id}\r\n*${fields.length}\r\n`;
    for (const field of fields) {
      encoded += `$${field.length}\r\n${field}\r\n`;
    }
  }

  return encoded;
}

function encodeXReadResult(results: StreamResult[]): string {
  let encoded = `*${results.length}\r\n`;

  for (const [streamKey, entries] of results) {
    encoded += `*2\r\n$${streamKey.length}\r\n${streamKey}\r\n`;
    encoded += encodeStreamEntries(entries);
  }

  return encoded;
}

function parseBlockTimeout(command: string[]): number {
  for (let i = 1; i < command.length; i++) {
    if (command[i]?.toUpperCase() !== "BLOCK") continue;
    const timeout = parseInt(command[i + 1] ?? "0", 10);

    return timeout === 0 ? Infinity : timeout;
  }

  return 0;
}

function findStreamsIndex(command: string[]): number {
  for (let i = 1; i < command.length; i++) {
    if (command[i]?.toUpperCase() === "STREAMS") return i + 1;
  }

  return -1;
}

function parseReadStart(
  streamKey: string,
  start: string,
  kvStore: KeyValueStore
): [number, number] {
  if (start === "$") {
    const entry = kvStore.get(streamKey);

    if (entry?.type === "stream") {
      return [entry.stream.last[0], entry.stream.last[1]];
    }
    return [0, 0];
  }

  const [timestampPart = "0", sequencePart = "0"] = start.split("-");
  return [parseInt(timestampPart, 10), parseInt(sequencePart, 10)];
}

function buildReadQueries(
  command: string[],
  firstStreamArgIndex: number,
  kvStore: KeyValueStore
): StreamQuery[] {
  const streamCount = (command.length - firstStreamArgIndex) / 2;
  const firstIdArgIndex = firstStreamArgIndex + streamCount;
  const queries: StreamQuery[] = [];

  for (let i = 0; i < streamCount; i++) {
    const streamKey = command[firstStreamArgIndex + i] ?? "";
    const start = command[firstIdArgIndex + i] ?? "";
    const [timestamp, sequence] = parseReadStart(streamKey, start, kvStore);
    queries.push([streamKey, timestamp, sequence]);
  }

  return queries;
}

function collectReadEntries(
  stream: {
    entries: Map<number, Map<number, string[]>>;
  },
  startTimestamp: number,
  startSequence: number
): StreamEntry[] {
  const entries: StreamEntry[] = [];

  for (const [timestamp, sequences] of stream.entries) {
    if (timestamp < startTimestamp) continue;

    for (const [sequence, fields] of sequences) {
      const isAfterStart =
        timestamp > startTimestamp || (timestamp === startTimestamp && sequence > startSequence);

      if (isAfterStart) {
        entries.push([`${timestamp}-${sequence}`, fields]);
      }
    }
  }

  return entries;
}

function readStreams(queries: StreamQuery[], kvStore: KeyValueStore): StreamResult[] {
  const result: StreamResult[] = [];

  for (const [streamKey, startTimestamp, startSequence] of queries) {
    const entry = kvStore.get(streamKey);
    if (entry?.type !== "stream") continue;

    const entries = collectReadEntries(entry.stream, startTimestamp, startSequence);

    if (entries.length > 0) {
      result.push([streamKey, entries]);
    }
  }

  return result;
}

export function handleXAdd(command: string[], kvStore: KeyValueStore): string {
  const streamKey = command[1] ?? "";
  const id = command[2] ?? "";

  const entry = getOrCreateStream(streamKey, kvStore);
  if (!entry) return encodeError("ERR no such key");

  if (entry.type !== "stream") {
    return encodeError("WRONGTYPE Operation against a key holding the wrong kind of value");
  }

  const stream = entry.stream;
  const parsedId = parseStreamId(id);
  const sequence = resolveSequence(parsedId, stream.last[0], stream.last[1]);

  const validationError = validateStreamId(
    parsedId.timestamp,
    sequence,
    stream.last[0],
    stream.last[1]
  );
  if (validationError) return encodeError(validationError);

  initializeFirstEntry(stream, parsedId.timestamp, sequence);
  appendStreamEntry(stream, parsedId.timestamp, sequence, command.slice(3));
  return encodeBulk(`${parsedId.timestamp}-${sequence}`);
}

export function handleXRange(command: string[], kvStore: KeyValueStore): string {
  const streamKey = command[1] ?? "";
  const start = command[2] ?? "-";
  const end = command[3] ?? "+";

  const entry = kvStore.get(streamKey);
  if (entry?.type !== "stream") {
    return "*0\r\n";
  }

  const stream = entry.stream;
  const [startTimestamp, startSequence] = parseRangeBoundary(start, stream.first);
  const [endTimestamp, endSequence] = parseRangeBoundary(end, stream.last, true);
  const result = collectRangeEntries(
    stream,
    startTimestamp,
    startSequence,
    endTimestamp,
    endSequence
  );

  return encodeStreamEntries(result);
}

export async function handleXRead(command: string[], kvStore: KeyValueStore): Promise<string> {
  const blockTimeout = parseBlockTimeout(command);
  const firstStreamArgIndex = findStreamsIndex(command);

  if (firstStreamArgIndex === -1) {
    return encodeError("ERR No stream key argument provided");
  }

  if ((command.length - firstStreamArgIndex) % 2 === 1) {
    return encodeError("ERR Missing arguments");
  }

  const queries = buildReadQueries(command, firstStreamArgIndex, kvStore);
  const startWait = Date.now();

  while (true) {
    const result = readStreams(queries, kvStore);

    if (result.length > 0) return encodeXReadResult(result);

    const elapsedWait = Date.now() - startWait;
    if (elapsedWait >= blockTimeout) return encodeNull();

    await sleep(100);
  }
}
