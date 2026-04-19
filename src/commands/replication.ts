import { encodeArray, encodeBulk, encodeInteger, encodeSimple } from "../protocol/encode.js";

import type { ServerConfig } from "../types.js";
import type { Socket } from "net";

function getEmptyRDB() {
  return Buffer.from(
    "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==",
    "base64"
  );
}

export function handleReplconf(command: string[], config: ServerConfig) {
  if (command[1]?.toUpperCase() === "GETACK") {
    return encodeArray(["REPLCONF", "ACK", config.offset.toString()]);
  }

  if (command[1]?.toUpperCase() === "ACK") {
    for (const handler of config.onReplicaAckHandlers) handler();
  }

  return encodeBulk("OK");
}

export function handlePsync(config: ServerConfig, connection: Socket) {
  connection.write(encodeSimple(`FULLRESYNC ${config.replid} 0`));

  const emptyRDB = getEmptyRDB();
  connection.write(`\$${emptyRDB.length}\r\n`);
  connection.write(emptyRDB);

  config.replicas.push({ connection, offset: 0, isActive: true });
}

function waitForReplicaAcks({
  config,
  requiredReplicas,
  timeoutMs,
  initialAcknowledged,
}: {
  config: ServerConfig;
  requiredReplicas: number;
  timeoutMs: number;
  initialAcknowledged: number;
}): Promise<string> {
  let acknowledgedReplicas = initialAcknowledged;

  return new Promise<string>((resolve) => {
    function cleanup() {
      config.onReplicaAckHandlers.delete(handleReplicaAck);
      clearTimeout(timeout);
    }

    function safeResolve(value: string) {
      cleanup();
      resolve(value);
    }

    function tryResolve() {
      if (acknowledgedReplicas >= requiredReplicas)
        safeResolve(encodeInteger(acknowledgedReplicas));
    }

    function handleReplicaAck() {
      acknowledgedReplicas++;
      tryResolve();
    }

    const timeout = setTimeout(() => {
      safeResolve(encodeInteger(acknowledgedReplicas));
    }, timeoutMs);

    config.onReplicaAckHandlers.add(handleReplicaAck);
    tryResolve();
  });
}

export async function handleWait(command: string[], config: ServerConfig) {
  const requiredReplicas = parseInt(command[1] ?? "0", 10);
  const timeoutMs = parseInt(command[2] ?? "0", 10);

  const activeReplicas = config.replicas.filter((replica) => replica.isActive);
  config.replicas = activeReplicas;

  let acknowledgedReplicas = 0;
  for (const replica of config.replicas) {
    if (replica.offset === 0) acknowledgedReplicas++;
  }

  for (const replica of config.replicas) {
    if (replica.offset <= 0) continue;

    try {
      const request = encodeArray(["REPLCONF", "GETACK", "*"]);
      replica.connection.write(request);
      replica.offset += request.length;
    } catch {
      replica.isActive = false;
    }
  }

  return waitForReplicaAcks({
    config,
    requiredReplicas,
    timeoutMs,
    initialAcknowledged: acknowledgedReplicas,
  });
}
