import { encodeBulk, encodeError } from "../protocol/encode.js";

import type { KeyValueStore } from "../types.js";

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
