import { randomBytes } from "node:crypto";

export function generateReplicationId() {
  return randomBytes(20).toString("hex");
}

export function getEmptyRDB() {
  return Buffer.from(
    "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==",
    "base64"
  );
}
