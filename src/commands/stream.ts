import { encodeBulk, encodeError, encodeNull } from "../protocol/encode.js";

import type { KeyValueStore } from "../types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function handleXAdd(command: string[], kvStore: KeyValueStore): string {
  const streamKey = command[1] ?? "";
  const id = command[2] ?? "";

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

  const entry = kvStore.get(streamKey);
  if (!entry) return encodeError("ERR no such key");
  if (entry.type !== "stream")
    return encodeError("WRONGTYPE Operation against a key holding the wrong kind of value");

  const stream = entry.stream;
  const idParts = id.split("-");
  let timestamp = 0;
  let sequence = 0;

  if (idParts.length === 1 && idParts[0] === "*") {
    timestamp = Date.now();
  } else {
    timestamp = parseInt(idParts[0] ?? "0", 10);
  }

  if (idParts.length === 2) {
    if (idParts[1] === "*") {
      if (stream.last[0] === timestamp) {
        sequence = stream.last[1] + 1;
      }
    } else {
      sequence = parseInt(idParts[1] ?? "0", 10);
    }
  }

  if (timestamp === 0 && sequence === 0)
    return encodeError("ERR The ID specified in XADD must be greater than 0-0");

  if (timestamp < stream.last[0] || (timestamp === stream.last[0] && sequence <= stream.last[1])) {
    return encodeError(
      "ERR The ID specified in XADD is equal or smaller than the target stream top item"
    );
  }

  if (stream.last[0] === 0 && stream.last[1] === 0) {
    stream.first[0] = timestamp;
    stream.first[1] = sequence;
  }

  stream.last[0] = timestamp;
  stream.last[1] = sequence;

  if (!stream.entries.has(timestamp)) stream.entries.set(timestamp, new Map());
  stream.entries.get(timestamp)?.set(sequence, command.slice(3));

  return encodeBulk(`${timestamp}-${sequence}`);
}

export function handleXRange(command: string[], kvStore: KeyValueStore): string {
  const streamKey = command[1] ?? "";
  const start = command[2] ?? "-";
  const end = command[3] ?? "+";

  const entry = kvStore.get(streamKey);
  if (entry?.type !== "stream") return "*0\r\n";

  const stream = entry.stream;

  let startTimestamp = 0;
  let startSequence = 0;
  let endTimestamp = Infinity;
  let endSequence = Infinity;

  if (start === "-") {
    startTimestamp = stream.first[0];
    startSequence = stream.first[1];
  } else {
    startTimestamp = parseInt(start.split("-")[0] ?? "0", 10);
    if (start.includes("-")) {
      startSequence = parseInt(start.split("-")[1] ?? "0", 10);
    }
  }

  if (end === "+") {
    endTimestamp = stream.last[0];
    endSequence = stream.last[1];
  } else {
    endTimestamp = parseInt(end.split("-")[0] ?? "0", 10);
    if (end.includes("-")) {
      endSequence = parseInt(end.split("-")[1] ?? "0", 10);
    }
  }

  const result: [string, string[]][] = [];

  for (const [timestamp, sequences] of stream.entries) {
    if (timestamp < startTimestamp || timestamp > endTimestamp) continue;

    for (const [sequence, fields] of sequences) {
      const afterStart =
        timestamp > startTimestamp || (timestamp === startTimestamp && sequence >= startSequence);
      const beforeEnd =
        timestamp < endTimestamp || (timestamp === endTimestamp && sequence <= endSequence);

      if (afterStart && beforeEnd) {
        result.push([`${timestamp}-${sequence}`, fields]);
      }
    }
  }

  let encoded = `*${result.length}\r\n`;
  for (const [id, fields] of result) {
    encoded += `*2\r\n$${id.length}\r\n${id}\r\n`;
    encoded += `*${fields.length}\r\n`;
    for (const field of fields) {
      encoded += `$${field.length}\r\n${field}\r\n`;
    }
  }

  return encoded;
}

export async function handleXRead(command: string[], kvStore: KeyValueStore): Promise<string> {
  let blockTimeout = 0;
  let firstStreamArgIndex = -1;

  for (let i = 1; i < command.length; i++) {
    const arg = command[i];
    if (!arg) continue;

    if (arg.toUpperCase() === "BLOCK") {
      blockTimeout = parseInt(command[i + 1] ?? "0", 10);
      if (blockTimeout === 0) blockTimeout = Infinity;
      i++;
    }

    if (arg.toUpperCase() === "STREAMS") {
      firstStreamArgIndex = i + 1;
      break;
    }
  }

  if (firstStreamArgIndex === -1) {
    return encodeError("ERR No stream key argument provided");
  }

  if ((command.length - firstStreamArgIndex) % 2 === 1) {
    return encodeError("ERR Missing arguments");
  }

  const firstIdArgIndex = firstStreamArgIndex + (command.length - firstStreamArgIndex) / 2;

  const queries: [string, number, number][] = [];

  for (
    let streamArgIndex = firstStreamArgIndex, idArgIndex = firstIdArgIndex;
    streamArgIndex < firstIdArgIndex;
    streamArgIndex++, idArgIndex++
  ) {
    const streamKey = command[streamArgIndex] ?? "";
    const start = command[idArgIndex] ?? "";

    let startTimestamp = 0;
    let startSequence = 0;

    if (start === "$") {
      const entry = kvStore.get(streamKey);
      if (entry?.type === "stream") {
        startTimestamp = entry.stream.last[0];
        startSequence = entry.stream.last[1];
      }
    } else {
      startTimestamp = parseInt(start, 10);
      if (start.includes("-")) {
        startSequence = parseInt(start.split("-")[1] ?? "0", 10);
      }
    }

    queries.push([streamKey, startTimestamp, startSequence]);
  }

  const startWait = Date.now();

  while (true) {
    const result: [string, [string, string[]][]][] = [];

    for (const [streamKey, startTimestamp, startSequence] of queries) {
      const entry = kvStore.get(streamKey);
      if (entry?.type !== "stream") continue;

      const stream = entry.stream;
      const streamEntries: [string, string[]][] = [];

      for (const [timestamp, sequences] of stream.entries) {
        if (timestamp < startTimestamp) continue;
        for (const [sequence, fields] of sequences) {
          if (
            timestamp > startTimestamp ||
            (timestamp === startTimestamp && sequence > startSequence)
          ) {
            streamEntries.push([`${timestamp}-${sequence}`, fields]);
          }
        }
      }

      if (streamEntries.length > 0) {
        result.push([streamKey, streamEntries]);
      }
    }

    const elapsedWait = Date.now() - startWait;
    if (result.length > 0 || elapsedWait > blockTimeout) {
      if (result.length === 0) return encodeNull();

      let encoded = `*${result.length}\r\n`;
      for (const [key, entries] of result) {
        encoded += `*2\r\n$${key.length}\r\n${key}\r\n`;
        encoded += `*${entries.length}\r\n`;
        for (const [id, fields] of entries) {
          encoded += `*2\r\n$${id.length}\r\n${id}\r\n`;
          encoded += `*${fields.length}\r\n`;
          for (const field of fields) {
            encoded += `$${field.length}\r\n${field}\r\n`;
          }
        }
      }
      return encoded;
    }

    await sleep(100);
  }
}
