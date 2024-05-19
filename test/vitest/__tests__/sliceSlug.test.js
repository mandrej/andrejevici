import { describe, expect, it } from "vitest";
import { sliceSlug } from "../../../src/helpers/index";

describe("sliceSlug", () => {
  it("should return an empty array when given an empty string", () => {
    expect(sliceSlug("")).toEqual([]);
  });

  it("should return an array of words when given a string with hyphens", () => {
    expect(sliceSlug("hello-world")).toEqual([
      "hel",
      "hell",
      "hello",
      "wor",
      "worl",
      "world",
    ]);
  });

  it("should return an array of words when given a string with multiple hyphens", () => {
    expect(sliceSlug("hello-world-of-code")).toEqual([
      "hel",
      "hell",
      "hello",
      "wor",
      "worl",
      "world",
      "cod",
      "code",
    ]);
  });
});
