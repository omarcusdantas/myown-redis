export interface ServerConfig {
  host: string;
  port: number;
  role: string;
  replid: string;
  offset: number;
  replicaOfHost: string;
  replicaOfPort: number;
  ackCount: number;
}

export type KeyValueStore = Map<string, { value: string; expiration: Date | null }>;
