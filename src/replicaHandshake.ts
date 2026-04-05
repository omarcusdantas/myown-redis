import { connect } from "node:net";
import { handleConnection } from "./handleConnection.js";
import { encodeArray } from "./utils.js";

import type { KeyValueStore, ServerConfig } from "./types.js";

export function replicaHandshake(config: ServerConfig, kvStore: KeyValueStore) {
  if (config.role === "master") {
    return;
  }

  const connection = connect(config.replicaOfPort, config.replicaOfHost);
  connection.write(encodeArray(["ping"]));

  let stage = 0;
  const onData = (dataBuffer: Buffer) => {
    const data = dataBuffer.toString();

    switch (stage) {
      case 0:
        console.log("Handshake 1 (ping): ", data);
        connection.write(encodeArray(["replconf", "listening-port", config.port.toString()]));
        stage++;
        break;

      case 1:
        console.log("Handshake 2a (listening-port): ", data);
        connection.write(encodeArray(["replconf", "capa", "psync2"]));
        stage++;
        break;

      case 2:
        console.log("Handshake 2b (capa): ", data);
        connection.write(encodeArray(["psync", "?", "-1"]));
        connection.removeListener("data", onData);
        handleConnection(connection, kvStore, config, false);
        break;

      default:
        break;
    }
  };

  connection.addListener("data", onData);
}
