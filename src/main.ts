import { createServer } from "net";
import { decodeCommands } from "./decodeCommands.js";
import { processCommand } from "./processCommand.js";

import type { serverConfig } from "./types.js";
import type { Server, Socket } from "net";

function handleConnection(connection: Socket) {
  console.log("Client connected");
  connection.write("+OK\r\n");

  connection.on("data", (data) => {
    const commands = decodeCommands(data.toString());

    for (const cmd of commands) {
      const response = processCommand(cmd);
      if (response) connection.write(response);
    }
  });

  connection.on("close", () => {
    console.log("Client disconnected");
  });
}

function main() {
  const config: serverConfig = {
    host: "0.0.0.0",
    port: 6379,
  };

  const server: Server = createServer();
  server.listen(config.port, config.host);
  console.log(`Listening on ${config.host}:${config.port}`);

  server.on("connection", (connection) => {
    handleConnection(connection);
  });
}

main();
