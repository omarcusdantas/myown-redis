import { handleKeys, handleType } from "./generic.js";
import {
  handleHDel,
  handleHExists,
  handleHGet,
  handleHGetAll,
  handleHLen,
  handleHSet,
} from "./hash.js";
import {
  handleLLen,
  handleLPop,
  handleLPush,
  handleLRange,
  handleRPop,
  handleRPush,
} from "./list.js";
import { handlePsync, handleReplconf, handleWait } from "./replication.js";
import { handleCommand, handleEcho, handleInfo, handlePing } from "./server.js";
import { handleXAdd, handleXRange, handleXRead } from "./stream.js";
import { handleGet, handleSet } from "./string.js";
import { encodeArray, encodeError } from "../protocol/encode.js";

import type { KeyValueStore, ServerConfig } from "../types.js";
import type { Socket } from "net";

export async function processCommand({
  command,
  kvStore,
  config,
  sendReply,
  connection,
}: {
  command: string[];
  kvStore: KeyValueStore;
  config: ServerConfig;
  sendReply: boolean;
  connection: Socket;
}) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  let response: string | undefined;

  switch (commandCode) {
    case "COMMAND":
      response = handleCommand();
      break;

    case "PING":
      response = handlePing(sendReply);
      break;

    case "ECHO":
      response = handleEcho(command);
      break;

    case "SET":
      response = handleSet({ command, kvStore, sendReply, config });
      break;

    case "GET":
      response = handleGet(command, kvStore);
      break;

    case "KEYS":
      response = handleKeys(command, kvStore);
      break;

    case "INFO":
      response = handleInfo(config);
      break;

    case "REPLCONF":
      response = handleReplconf(command, config);
      break;

    case "PSYNC":
      handlePsync(config, connection);
      break;

    case "WAIT":
      response = await handleWait(command, config);
      break;

    case "TYPE":
      response = handleType(command, kvStore);
      break;

    case "LPUSH":
      response = handleLPush({ command, kvStore, sendReply, config });
      break;

    case "RPUSH":
      response = handleRPush({ command, kvStore, sendReply, config });
      break;

    case "LPOP":
      response = handleLPop({ command, kvStore, sendReply, config });
      break;

    case "RPOP":
      response = handleRPop({ command, kvStore, sendReply, config });
      break;

    case "LRANGE":
      response = handleLRange(command, kvStore);
      break;

    case "LLEN":
      response = handleLLen(command, kvStore);
      break;

    case "XADD":
      response = handleXAdd(command, kvStore);
      break;

    case "XRANGE":
      response = handleXRange(command, kvStore);
      break;

    case "XREAD":
      response = await handleXRead(command, kvStore);
      break;

    case "HSET":
      response = handleHSet({ command, kvStore, sendReply, config });
      break;

    case "HGET":
      response = handleHGet(command, kvStore);
      break;

    case "HGETALL":
      response = handleHGetAll(command, kvStore);
      break;

    case "HDEL":
      response = handleHDel({ command, kvStore, sendReply, config });
      break;

    case "HEXISTS":
      response = handleHExists(command, kvStore);
      break;

    case "HLEN":
      response = handleHLen(command, kvStore);
      break;

    default:
      response = encodeError("unknown command");
      break;
  }

  if (response) connection.write(response);
  config.offset += encodeArray(command).length;
}
