import { createServer } from "node:net";
import { handleConnection } from "./handleConnection.js";
import { replicaHandshake } from "./replicaHandshake.js";
import { generateReplicationId } from "./utils.js";

import type { KeyValueStore, ServerConfig } from "./types.js";
import type { Server } from "net";

function main() {
  const config: ServerConfig = {
    host: "0.0.0.0",
    port: 6379,
    role: "master",
    replid: generateReplicationId(),
    offset: 0,
    replicaOfHost: "",
    replicaOfPort: 0,
    ackCount: 0,
  };

  const kvStore: KeyValueStore = new Map();
  replicaHandshake(config, kvStore);

  const server: Server = createServer();
  server.listen(config.port, config.host);
  console.log(`Listening on ${config.host}:${config.port}`);

  server.on("connection", (connection) => {
    handleConnection(connection, kvStore, config, true);
  });
}

main();
