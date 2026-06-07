import type { Socket } from "net";

interface ReplicaState {
  connection: Socket;
  offset: number;
  isActive: boolean;
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
  onReplicaAckHandlers: Set<() => void>;
}

export type StreamEntry = string[];

export interface StreamData {
  first: [number, number];
  last: [number, number];
  entries: Map<number, Map<number, StreamEntry>>;
}

export interface ListNode {
  value: string;
  prev: ListNode | null;
  next: ListNode | null;
}

export interface LinkedList {
  head: ListNode | null;
  tail: ListNode | null;
  length: number;
}

export interface HashNode {
  field: string;
  value: string;
  prev: HashNode | null;
  next: HashNode | null;
}

export interface HashMap {
  head: HashNode | null;
  tail: HashNode | null;
  length: number;
  index: Map<string, HashNode>;
}

export type KVEntry =
  | { type: "string"; value: string; expiration: Date | null }
  | { type: "stream"; value: ""; expiration: null; stream: StreamData }
  | { type: "list"; value: ""; expiration: Date | null; list: LinkedList }
  | { type: "hash"; value: ""; expiration: Date | null; hash: HashMap };

export type KeyValueStore = Map<string, KVEntry>;
