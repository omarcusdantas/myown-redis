import { encodeBulk, encodeSimple } from "./encoders.js";

function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

export function processCommand(command: string[]) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  switch (commandCode) {
    case "PING":
      return encodeSimple("PONG");
    case "ECHO":
      return handleEcho(command);
  }
}
