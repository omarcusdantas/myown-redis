import { createServer } from "net";

import type { serverConfig } from "./types.js";
import type { Server, Socket } from "net";

function handleConnection(connection: Socket) {
  console.log("Client connected");

  connection.on("data", (data) => {
    console.log(`Received: ${data.toString()}`);
  });

  connection.on("close", () => {
    console.log("Client disconnected");
  });
}

function main() {
  const config: serverConfig = {
    host: "127.0.0.1",
    port: 6379,
  };

  const server: Server = createServer();
  server.listen(config.port, config.host);
  console.log(`Listening on ${config.host}:${config.port.toString()}`);

  server.on("connection", (connection) => {
    handleConnection(connection);
  });
}

main();
