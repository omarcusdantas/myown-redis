import { decodeCommands } from "./decodeCommands.js";
import { processCommand } from "./processCommand.js";

import type { KeyValueStore, ServerConfig } from "./types.js";
import type { Socket } from "net";

export function handleConnection(
  connection: Socket,
  kvStore: KeyValueStore,
  config: ServerConfig,
  sendReply: boolean
) {
  console.log("Client connected");
  connection.write("+OK\r\n");

  connection.on("data", (data) => {
    const commands = decodeCommands(data.toString());

    for (const command of commands) {
      processCommand({
        command,
        kvStore,
        config,
        sendReply,
        writer: (data) => connection.write(data),
      });
    }
  });

  connection.on("close", () => {
    console.log("Client disconnected");
  });
}
