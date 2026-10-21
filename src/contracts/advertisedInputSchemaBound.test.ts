import { describe, expect, it } from "vitest";

import { TOOL_CONTRACTS, toolContract } from "./toolContracts.js";
import { advertisedInputJsonSchema } from "./toolSchemaMetadata.js";

// The inline projection repeats reused definitions. compare_web_captures
// embeds two complete capture shapes per side and once advertised ~166 KB at
// 31 levels, which made MCP clients reject the whole connector.
const FULL_INPUT_SCHEMA_MAX_BYTES = 64 * 1024;

const depth = (value: unknown, level = 0): number => {
  if (Array.isArray(value))
    return Math.max(level, ...value.map((child) => depth(child, level + 1)));
  if (typeof value === "object" && value !== null)
    return Math.max(
      level,
      ...Object.values(value).map((child) => depth(child, level + 1)),
    );
  return level;
};

describe("advertised input schema bound", () => {
  it("keeps every advertised input schema within the full-profile bound", () => {
    const oversized = TOOL_CONTRACTS.flatMap((contract) => {
      const bytes = Buffer.byteLength(
        JSON.stringify(advertisedInputJsonSchema(contract)),
        "utf8",
      );
      return bytes > FULL_INPUT_SCHEMA_MAX_BYTES
        ? [`${contract.name}: ${bytes}`]
        : [];
    });
    expect(oversized).toEqual([]);
  });

  it("advertises compare_web_captures in reduced form with its root properties", () => {
    const schema = advertisedInputJsonSchema(
      toolContract("compare_web_captures"),
    );
    expect(depth(schema)).toBeLessThanOrEqual(10);
    expect(Object.keys(schema.properties as object)).toEqual(
      expect.arrayContaining([
        "before",
        "after",
        "before_scenario",
        "after_scenario",
        "normalization",
      ]),
    );
    expect(String(schema.description)).toContain("reduced form");
  });

  it("leaves schemas under the bound unreduced", () => {
    const schema = advertisedInputJsonSchema(
      toolContract("compare_application_versions"),
    );
    expect(String(schema.description ?? "")).not.toContain("reduced form");
    expect(depth(schema)).toBeGreaterThan(10);
  });
});
