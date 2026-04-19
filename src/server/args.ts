import type { ServerConfig } from "../types.js";

function handlePortArg(config: ServerConfig, args: string[], index: number) {
  const port = parseInt(args[index + 1] ?? "", 10);

  if (Number.isNaN(port)) return;
  config.port = port;
}

function handleReplicaOfArg(config: ServerConfig, args: string[], index: number) {
  const host = args[index + 1];
  const port = parseInt(args[index + 2] ?? "", 10);

  if (!host || Number.isNaN(port)) return;

  config.role = "slave";
  config.replicaOfHost = host;
  config.replicaOfPort = port;
}

export function processArgs(args: string[], config: ServerConfig) {
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--port":
        handlePortArg(config, args, i);
        i++;
        break;
      case "--replicaof":
        handleReplicaOfArg(config, args, i);
        i += 2;
        break;
    }
  }
}
