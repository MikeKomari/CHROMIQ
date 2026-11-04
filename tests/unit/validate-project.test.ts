import { describe, expect, it } from "vitest";

import {
  MAX_PROJECTS_PER_USER,
  validateProjectPayload,
} from "@/lib/server/validate-project";

/**
 * This is the only thing standing between a request body and a jsonb column,
 * so the failure cases are the point: a runaway blob, a missing name, and a
 * `data` that is not an object at all.
 */

describe("validateProjectPayload", () => {
  it("accepts a name and an object, and trims the name", () => {
    const result = validateProjectPayload({ name: "  My system  ", data: { tokens: {} } });
    expect(result.error).toBeUndefined();
    expect(result.name).toBe("My system");
    expect(result.data).toEqual({ tokens: {} });
  });

  it.each([
    ["null", null],
    ["a string", "name=x"],
    ["a number", 7],
    ["undefined", undefined],
  ])("rejects a body that is %s", (_label, body) => {
    expect(validateProjectPayload(body).error).toBe("Send a JSON body with a name and data.");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["only whitespace", "   "],
    ["not a string", 42],
    ["null", null],
  ])("rejects a name that is %s", (_label, name) => {
    expect(validateProjectPayload({ name, data: {} }).error).toBe(
      "Give the project a name of 120 characters or fewer.",
    );
  });

  it("rejects a name over 120 characters", () => {
    expect(validateProjectPayload({ name: "x".repeat(121), data: {} }).error).toBeTruthy();
  });

  it("accepts a name of exactly 120 characters", () => {
    expect(validateProjectPayload({ name: "x".repeat(120), data: {} }).error).toBeUndefined();
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["a string", "tokens"],
    ["a number", 1],
    ["a boolean", true],
  ])("rejects data that is %s", (_label, data) => {
    expect(validateProjectPayload({ name: "x", data }).error).toBe(
      "The project data must be an object.",
    );
  });

  it("accepts an array, which is an object as far as jsonb is concerned", () => {
    // Not a shape the client sends, but it round-trips through the column, so
    // there is nothing to refuse it for.
    expect(validateProjectPayload({ name: "x", data: [] }).error).toBeUndefined();
  });

  it("rejects a payload over half a megabyte", () => {
    const data = { blob: "x".repeat(600 * 1024) };
    expect(validateProjectPayload({ name: "x", data }).error).toBe(
      "That project is too large to sync.",
    );
  });

  it("accepts a payload just under the limit", () => {
    const data = { blob: "x".repeat(400 * 1024) };
    expect(validateProjectPayload({ name: "x", data }).error).toBeUndefined();
  });

  it("measures the data only, not the name", () => {
    // The name is capped separately; counting it here would make the limit
    // depend on two unrelated fields.
    const data = { blob: "x".repeat(400 * 1024) };
    expect(
      validateProjectPayload({ name: "x".repeat(120), data }).error,
    ).toBeUndefined();
  });

  it("names a per-user cap the route can enforce", () => {
    expect(MAX_PROJECTS_PER_USER).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_PROJECTS_PER_USER)).toBe(true);
  });
});
