import { handleReplconf } from "./replication.js";
import type { ServerConfig } from "../types.js";

function createConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    host: "localhost",
    port: 6379,
    role: "master",
    replid: "abc123",
    offset: 42,
    replicaOfHost: "",
    replicaOfPort: 0,
    ackCount: 0,
    replicas: [],
    onReplicaAckHandlers: new Set(),
    ...overrides,
  };
}

describe("replication commands", () => {
  describe("handleReplconf", () => {
    it("returns ACK response with current offset for GETACK", () => {
      const config = createConfig({ offset: 100 });
      const result = handleReplconf(["REPLCONF", "GETACK", "*"], config);
      expect(result).toBe("*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$3\r\n100\r\n");
    });

    it("returns OK for non-GETACK subcommands", () => {
      const config = createConfig();
      const result = handleReplconf(["REPLCONF", "LISTENING-PORT", "6380"], config);
      expect(result).toBe("$2\r\nOK\r\n");
    });

    it("triggers ack handlers when ACK subcommand received", () => {
      let sideEffect = 0;
      const config = createConfig({
        onReplicaAckHandlers: new Set([
          () => {
            sideEffect = 99;
          },
        ]),
      });
      handleReplconf(["REPLCONF", "ACK", "42"], config);
      expect(sideEffect).toBe(99);
    });

    it("returns OK for ACK subcommand", () => {
      const config = createConfig();
      const result = handleReplconf(["REPLCONF", "ACK", "42"], config);
      expect(result).toBe("$2\r\nOK\r\n");
    });

    it("is case-insensitive for subcommand matching", () => {
      const config = createConfig({ offset: 50 });
      const result = handleReplconf(["REPLCONF", "getack", "*"], config);
      expect(result).toBe("*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$2\r\n50\r\n");
    });

    it("uses current offset in GETACK response", () => {
      const config = createConfig({ offset: 0 });
      const result = handleReplconf(["REPLCONF", "GETACK", "*"], config);
      expect(result).toBe("*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$1\r\n0\r\n");
    });
  });
});
