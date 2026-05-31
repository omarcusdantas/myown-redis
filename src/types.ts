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

export type KVEntry =
  | { type: "string"; value: string; expiration: Date | null }
  | { type: "stream"; value: ""; expiration: null; stream: StreamData }
  | { type: "list"; value: ""; expiration: Date | null; list: LinkedList };

export type KeyValueStore = Map<string, KVEntry>;
