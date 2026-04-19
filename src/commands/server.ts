import { encodeBulk } from "../protocol/encode.js";

import type { ServerConfig } from "../types.js";

export function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

export function handleInfo(config: ServerConfig) {
  return encodeBulk(
    `role:${config.role}\r\nmaster_replid:${config.replid}\r\nmaster_repl_offset:${config.offset}\r\n`
  );
}
