import { encodeSimple } from "./encoders.js";

export function processCommand(command: string[]) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  switch (commandCode) {
    case "PING":
      return encodeSimple("PONG");
  }
}
