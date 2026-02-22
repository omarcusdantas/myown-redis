export interface ServerConfig {
  host: string;
  port: number;
}

export type KeyValueStore = Map<string, { value: string }>;
