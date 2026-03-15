import { randomBytes } from "node:crypto";

export function generateReplicationId(): string {
  return randomBytes(20).toString("hex");
}
