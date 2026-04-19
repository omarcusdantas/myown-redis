import { createServer } from "node:net";
import { generateReplicationId, replicaHandshake } from "./replication/handshake.js";
import { processArgs } from "./server/args.js";
import { handleConnection } from "./server/connection.js";

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
    replicas: [],
    onReplicaAckHandlers: new Set(),
  };

  const kvStore: KeyValueStore = new Map();
  processArgs(process.argv, config);
  replicaHandshake(config, kvStore);

  const server: Server = createServer();
  server.listen(config.port, config.host);
  console.log(`Listening on ${config.host}:${config.port}`);

  server.on("connection", (connection) => {
    handleConnection(connection, kvStore, config, true);
  });
}

main();
