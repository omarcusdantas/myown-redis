import type { Socket } from "net";

interface ReplicaState {
  connection: Socket;
  offset: number;
  active: boolean;
}

export interface ServerConfig {
  host: string;
  port: number;
  role: string;
  replid: string;
  offset: number;
  replicaOfHost: string;
  replicaOfPort: number;
  ackCount: number;
  replicas: ReplicaState[];
}

export type KeyValueStore = Map<string, { value: string; expiration: Date | null }>;
