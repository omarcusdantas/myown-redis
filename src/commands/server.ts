import { encodeBulk, encodeSimple } from "../protocol/encode.js";

import type { ServerConfig } from "../types.js";

export function handlePing(sendReply: boolean) {
  if (!sendReply) return;
  return encodeSimple("PONG");
}

export function handleCommand() {
  return encodeSimple("OK");
}

export function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

export function handleInfo(config: ServerConfig) {
  return encodeBulk(
    `role:${config.role}\r\nmaster_replid:${config.replid}\r\nmaster_repl_offset:${config.offset}\r\n`
  );
}
