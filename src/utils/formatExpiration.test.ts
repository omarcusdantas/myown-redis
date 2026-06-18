import { formatExpiration } from "./formatExpiration.js";

describe("formatExpiration", () => {
  it("converts EX (seconds) to a future Date relative to now", () => {
    const before = Date.now();
    const result = formatExpiration("EX", 10);
    const after = Date.now();

    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBeGreaterThanOrEqual(before + 10_000);
    expect(result?.getTime()).toBeLessThanOrEqual(after + 10_000);
  });

  it("converts PX (milliseconds) to a future Date relative to now", () => {
    const before = Date.now();
    const result = formatExpiration("PX", 5000);
    const after = Date.now();

    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBeGreaterThanOrEqual(before + 5000);
    expect(result?.getTime()).toBeLessThanOrEqual(after + 5000);
  });

  it("converts EXAT (unix seconds) to an absolute Date", () => {
    const unixSeconds = 1700000000;
    const result = formatExpiration("EXAT", unixSeconds);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(unixSeconds * 1000);
  });

  it("converts PXAT (unix milliseconds) to an absolute Date", () => {
    const unixMs = 1700000000000;
    const result = formatExpiration("PXAT", unixMs);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(unixMs);
  });

  it("returns null for unknown option", () => {
    expect(formatExpiration("UNKNOWN", 100)).toBeNull();
  });

  it("returns null for lowercase options (case-sensitive)", () => {
    expect(formatExpiration("ex", 10)).toBeNull();
    expect(formatExpiration("px", 10)).toBeNull();
  });
});
