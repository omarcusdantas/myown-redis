import { processCommand } from "../commands/index.js";
import { decodeCommands } from "../protocol/decode.js";

import type { KeyValueStore, ServerConfig } from "../types.js";
import type { Socket } from "net";

export function handleConnection(
  connection: Socket,
  kvStore: KeyValueStore,
  config: ServerConfig,
  sendReply: boolean
) {
  console.log("Client connected");

  async function handleData(data: Buffer | string) {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const commands = decodeCommands(buffer);

      for (const command of commands) {
        await processCommand({
          command,
          kvStore,
          config,
          sendReply,
          connection,
        });
      }
    } catch (err) {
      console.error("Error handling data:", err);
    }
  }

  connection.on("data", (data) => {
    void handleData(data);
  });

  connection.on("close", () => {
    console.log("Client disconnected");
  });
}
