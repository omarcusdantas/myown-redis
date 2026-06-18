import {
  encodeArray,
  encodeBulk,
  encodeError,
  encodeInteger,
  encodeNull,
  encodeSimple,
} from "./encode.js";

describe("encode", () => {
  describe("encodeNull", () => {
    it("returns the RESP null bulk string", () => {
      expect(encodeNull()).toBe("$-1\r\n");
    });
  });

  describe("encodeSimple", () => {
    it("wraps string with + prefix and CRLF", () => {
      expect(encodeSimple("OK")).toBe("+OK\r\n");
    });

    it("handles empty string", () => {
      expect(encodeSimple("")).toBe("+\r\n");
    });
  });

  describe("encodeBulk", () => {
    it("encodes string as RESP bulk string with length", () => {
      expect(encodeBulk("hello")).toBe("$5\r\nhello\r\n");
    });

    it("handles empty string", () => {
      expect(encodeBulk("")).toBe("$0\r\n\r\n");
    });

    it("calculates correct length for multi-byte content", () => {
      expect(encodeBulk("hello world")).toBe("$11\r\nhello world\r\n");
    });
  });

  describe("encodeArray", () => {
    it("encodes array of strings as RESP array", () => {
      expect(encodeArray(["foo", "bar"])).toBe("*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
    });

    it("encodes empty array", () => {
      expect(encodeArray([])).toBe("*0\r\n");
    });

    it("handles single element", () => {
      expect(encodeArray(["a"])).toBe("*1\r\n$1\r\na\r\n");
    });

    it("handles elements of different lengths", () => {
      expect(encodeArray(["a", "bb", "ccc"])).toBe("*3\r\n$1\r\na\r\n$2\r\nbb\r\n$3\r\nccc\r\n");
    });
  });

  describe("encodeError", () => {
    it("wraps error message with - prefix and CRLF", () => {
      expect(encodeError("ERR wrong number of arguments")).toBe(
        "-ERR wrong number of arguments\r\n"
      );
    });
  });

  describe("encodeInteger", () => {
    it("encodes number as RESP integer", () => {
      expect(encodeInteger(42)).toBe(":42\r\n");
    });

    it("handles zero", () => {
      expect(encodeInteger(0)).toBe(":0\r\n");
    });

    it("handles negative numbers", () => {
      expect(encodeInteger(-1)).toBe(":-1\r\n");
    });
  });
});
