import { encodeArray } from "../protocol/encode.js";

import type { ServerConfig } from "../types.js";

export function propagateToReplicas(config: ServerConfig, command: string[]) {
  config.replicas = config.replicas.filter((replica) => replica.isActive);

  for (const replica of config.replicas) {
    try {
      const encodedCommand = encodeArray(command);
      replica.connection.write(encodedCommand);
      replica.offset += encodedCommand.length;
    } catch {
      replica.isActive = false;
    }
  }
}
