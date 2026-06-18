import { globToRegExp } from "./globToRegExp.js";

describe("globToRegExp", () => {
  it("matches literal strings exactly", () => {
    const regex = globToRegExp("hello");
    expect(regex.test("hello")).toBe(true);
    expect(regex.test("Hello")).toBe(false);
    expect(regex.test("helloo")).toBe(false);
    expect(regex.test("hell")).toBe(false);
  });

  it("converts * to match any sequence of characters", () => {
    const regex = globToRegExp("h*llo");
    expect(regex.test("hello")).toBe(true);
    expect(regex.test("hllo")).toBe(true);
    expect(regex.test("heeeello")).toBe(true);
    expect(regex.test("hell")).toBe(false);
  });

  it("converts ? to match a single character", () => {
    const regex = globToRegExp("h?llo");
    expect(regex.test("hello")).toBe(true);
    expect(regex.test("hxllo")).toBe(true);
    expect(regex.test("hllo")).toBe(false);
    expect(regex.test("hxxlo")).toBe(false);
  });

  it("handles character classes [abc]", () => {
    const regex = globToRegExp("[abc]");
    expect(regex.test("a")).toBe(true);
    expect(regex.test("b")).toBe(true);
    expect(regex.test("c")).toBe(true);
    expect(regex.test("d")).toBe(false);
  });

  it("treats unclosed bracket as literal", () => {
    const regex = globToRegExp("[abc");
    expect(regex.test("[abc")).toBe(true);
    expect(regex.test("a")).toBe(false);
  });

  it("handles backslash escapes", () => {
    const regex = globToRegExp("\\*");
    expect(regex.test("*")).toBe(true);
    expect(regex.test("a")).toBe(false);
  });

  it("escapes dots to literal match", () => {
    const regex = globToRegExp("a.b");
    expect(regex.test("a.b")).toBe(true);
    expect(regex.test("axb")).toBe(false);
  });

  it("escapes plus signs to literal match", () => {
    const regex = globToRegExp("a+b");
    expect(regex.test("a+b")).toBe(true);
    expect(regex.test("aab")).toBe(false);
  });

  it("handles empty pattern", () => {
    const regex = globToRegExp("");
    expect(regex.test("")).toBe(true);
    expect(regex.test("a")).toBe(false);
  });

  it("handles pattern with multiple wildcards", () => {
    const regex = globToRegExp("*key*");
    expect(regex.test("mykey")).toBe(true);
    expect(regex.test("key123")).toBe(true);
    expect(regex.test("mykeyvalue")).toBe(true);
    expect(regex.test("ky")).toBe(false);
  });

  it("handles combined glob characters", () => {
    const regex = globToRegExp("user:?*");
    expect(regex.test("user:1abc")).toBe(true);
    expect(regex.test("user:1")).toBe(true);
    expect(regex.test("user:")).toBe(false);
  });
});
