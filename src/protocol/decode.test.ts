import { decodeCommands } from "./decode.js";

describe("decodeCommands", () => {
  it("decodes a single command with one argument", () => {
    const data = Buffer.from("*1\r\n$4\r\nPING\r\n");
    expect(decodeCommands(data)).toEqual([["PING"]]);
  });

  it("decodes a command with multiple arguments", () => {
    const data = Buffer.from("*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
    expect(decodeCommands(data)).toEqual([["SET", "foo", "bar"]]);
  });

  it("decodes multiple commands in sequence", () => {
    const data = Buffer.from("*1\r\n$4\r\nPING\r\n*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
    expect(decodeCommands(data)).toEqual([["PING"], ["SET", "foo", "bar"]]);
  });

  it("returns empty array for empty input", () => {
    const data = Buffer.from("");
    expect(decodeCommands(data)).toEqual([]);
  });

  it("strips FULLRESYNC prefix and decodes remaining commands", () => {
    const data = Buffer.from("+FULLRESYNC replid 0\r\n*1\r\n$4\r\nPING\r\n");
    expect(decodeCommands(data)).toEqual([["PING"]]);
  });

  it("strips FULLRESYNC and RDB bulk prefix and decodes remaining commands", () => {
    const rdbData = "hello";
    const data = Buffer.from(
      `+FULLRESYNC replid 0\r\n$${rdbData.length}\r\n${rdbData}*1\r\n$4\r\nPING\r\n`
    );
    expect(decodeCommands(data)).toEqual([["PING"]]);
  });

  it("throws on invalid array size", () => {
    const data = Buffer.from("*abc\r\n$4\r\nPING\r\n");
    expect(() => decodeCommands(data)).toThrow("expected non-negative integer");
  });

  it("throws on negative array size", () => {
    const data = Buffer.from("*-1\r\n");
    expect(() => decodeCommands(data)).toThrow("expected non-negative integer");
  });

  it("throws on invalid bulk string header", () => {
    const data = Buffer.from("*1\r\n+OK\r\n");
    expect(() => decodeCommands(data)).toThrow("Invalid bulk string header");
  });

  it("throws on bulk string length mismatch", () => {
    const data = Buffer.from("*1\r\n$5\r\nhi\r\n");
    expect(() => decodeCommands(data)).toThrow("Bulk string length mismatch");
  });

  it("throws on unexpected end of input for array elements", () => {
    const data = Buffer.from("*2\r\n$4\r\nPING\r\n");
    expect(() => decodeCommands(data)).toThrow("Unexpected end of input");
  });

  it("throws on invalid RDB size after FULLRESYNC", () => {
    const data = Buffer.from("+FULLRESYNC replid 0\r\n$abc\r\n");
    expect(() => decodeCommands(data)).toThrow("Invalid RDB size");
  });

  it("throws on invalid bulk string length", () => {
    const data = Buffer.from("*1\r\n$-5\r\nhello\r\n");
    expect(() => decodeCommands(data)).toThrow("expected non-negative integer");
  });
});
