# MyOwn Redis

A Redis server clone built from scratch in TypeScript on top of Node.js' `net` module. It speaks the [RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/) wire protocol, so you can talk to it with `redis-cli` or any standard Redis client. It supports multiple data types, key expiration and master–replica replication.

## :speech_balloon: Description

This project contains all the files for an in-memory key-value server compatible with the Redis protocol.

- RESP protocol encoder/decoder built from scratch (simple strings, errors, integers, bulk strings and arrays).
- TCP server handling multiple concurrent client connections.
- In-memory key-value store supporting **string**, **list**, **hash** and **stream** types.
- Key expiration with `EX`, `PX`, `EXAT` and `PXAT` options, lazily evicted on access.
- `KEYS` pattern matching through a custom glob-to-regex converter (`*`, `?`, `[...]`).
- Custom data structures: a doubly linked list backing lists and an insertion-ordered, index-backed linked list backing hashes.
- Streams with auto-generated IDs, range queries and blocking reads (`XREAD ... BLOCK`).
- Master–replica replication: handshake, `PSYNC` full resync, command propagation and `WAIT` for acknowledgements.

## ✨ Tech

- [Node.js](https://nodejs.org/) as the JavaScript runtime, using the built-in [`net`](https://nodejs.org/api/net.html) module for raw TCP sockets.
- [TypeScript](https://www.typescriptlang.org/) with strict type checking for the whole codebase.
- [tsx](https://github.com/privatenumber/tsx) for running and hot-reloading the server in development.
- [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) for unit testing.
- [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for linting and formatting, enforced on commit via [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) and [lint-staged](https://github.com/lint-staged/lint-staged).
- [pnpm](https://pnpm.io/) as the package manager.

## :computer: Usage

To run the project locally you need:

```
Node.js >= 22
pnpm
A Redis client (redis-cli recommended) to send commands
```

- Clone or download the repository.
- Open a terminal in the root of the project and install dependencies:

```bash
pnpm install
```

- Start the server in development mode (hot reload):

```bash
pnpm run dev
```

- Or build and run the compiled output:

```bash
pnpm run build
pnpm run start
```

- The server listens on `0.0.0.0:6379` by default. Connect with any Redis client and start sending commands:

```bash
redis-cli -p 6379
> PING
PONG
> SET name redis EX 60
OK
> GET name
"redis"
```

### Command-line flags

- `--port <port>` — change the port the server listens on (default `6379`).
- `--replicaof <host> <port>` — start the server as a **replica** of the given master. The replica performs the handshake, receives propagated writes and answers `WAIT`/`REPLCONF GETACK`.

```bash
# Master on 6379
pnpm run dev

# Replica on 6380 following the master
pnpm run dev -- --port 6380 --replicaof localhost 6379
```

### Tests

- Run the test suite:

```bash
pnpm test
```

- Run with coverage:

```bash
pnpm run test:coverage
```

## :world_map: Commands

The server dispatches commands case-insensitively. The following are supported:

### Connection & server

- `PING` — replies with `PONG`.
- `ECHO <message>` — replies with the given message.
- `COMMAND` — replies with `OK` (stub for client handshakes).
- `INFO` — returns replication info (`role`, `master_replid`, `master_repl_offset`).

### Generic

- `KEYS <pattern>` — returns all keys matching a glob pattern.
- `TYPE <key>` — returns the type of the value stored at a key.

### Strings

- `SET <key> <value> [EX|PX|EXAT|PXAT <time>]` — stores a string, optionally with an expiration.
- `GET <key>` — returns the value at a key (or nil if missing/expired).

### Lists

- `LPUSH <key> <element...>` / `RPUSH <key> <element...>` — prepend/append elements.
- `LPOP <key> [count]` / `RPOP <key> [count]` — pop elements from the head/tail.
- `LRANGE <key> <start> <stop>` — return a range of elements (supports negative indexes).
- `LLEN <key>` — return the length of the list.

### Hashes

- `HSET <key> <field> <value> [field value...]` — set one or more field-value pairs.
- `HGET <key> <field>` — return the value of a field.
- `HGETALL <key>` — return all fields and values.
- `HDEL <key> <field...>` — delete one or more fields.
- `HEXISTS <key> <field>` — check whether a field exists.
- `HLEN <key>` — return the number of fields.

### Streams

- `XADD <key> <id|*> <field value...>` — append an entry (`*` auto-generates the ID).
- `XRANGE <key> <start> <end>` — return entries within an ID range (`-`/`+` for open ends).
- `XREAD [BLOCK <ms>] STREAMS <key...> <id...>` — read new entries, optionally blocking until data arrives.

### Replication

- `REPLCONF ...` — replication configuration exchange (`listening-port`, `capa`, `GETACK`, `ACK`).
- `PSYNC <replid> <offset>` — full resynchronization, sends a `FULLRESYNC` reply followed by an empty RDB.
- `WAIT <numreplicas> <timeout>` — block until the given number of replicas acknowledge writes or the timeout elapses.

## :pushpin: Next steps

- Add RDB and/or AOF persistence so data survives restarts (currently the empty RDB is a placeholder).
- Implement more commands (`DEL`, `EXPIRE`, `TTL`, `INCR`, `EXISTS`, transactions with `MULTI`/`EXEC`, pub/sub).
- Add active expiration instead of lazy eviction only.
- Support inline commands and RESP3.
- Harden the replica side (reconnection, partial resync).
- Improve tests and coverage.

## :bulb: Contributing

This project is currently not open for contributions. However, you are welcome to fork the repository and make modifications for personal use.

## :memo: License

This project is released under the MIT License.

## :books: Credits

This project was created as a learning project by Marcus Dantas.
