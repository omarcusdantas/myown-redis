import { decodeCommands } from "./decodeCommands.js";
import { processCommand } from "./processCommand.js";

import type { KeyValueStore, ServerConfig } from "./types.js";
import type { Socket } from "net";

export function handleConnection(connection: Socket, kvStore: KeyValueStore, config: ServerConfig, sendReply: boolean) {
  console.log("Client connected");
  connection.write("+OK\r\n");

  connection.on("data", (data) => {
    const commands = decodeCommands(data.toString());

    for (const cmd of commands) {
      const response = processCommand(cmd, kvStore, config, sendReply);
      if (response) connection.write(response);
    }
  });

  connection.on("close", () => {
    console.log("Client disconnected");
  });
}
