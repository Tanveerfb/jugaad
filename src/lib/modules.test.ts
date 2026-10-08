import { describe, expect, it } from "vitest";
import { moduleSchema } from "@/schemas/module-schema";
import { MODULES, getModule, isLit } from "./modules";

describe("MODULES", () => {
  it("lists the four spec modules in phase order", () => {
    expect(MODULES.map((m) => m.id)).toEqual(["organiser", "voice", "ask-my-files", "auditor"]);
    expect(MODULES.map((m) => m.phase)).toEqual([1, 2, 3, 4]);
  });

  it("gives a route only to modules that are not planned", () => {
    for (const m of MODULES) {
      expect(Boolean(m.href)).toBe(m.state !== "planned");
    }
  });
});

describe("isLit", () => {
  const base = MODULES[0];
  it("lights a module that needs attention or is working", () => {
    expect(isLit({ ...base, state: "attention" })).toBe(true);
    expect(isLit({ ...base, state: "working" })).toBe(true);
  });
  it("does not light an idle or planned module", () => {
    expect(isLit({ ...base, state: "idle" })).toBe(false);
    expect(isLit({ ...base, state: "planned" })).toBe(false);
  });
});

describe("getModule", () => {
  it("finds a module by id", () => {
    expect(getModule("auditor").name).toBe("Auditor");
  });
  it("throws on an unknown id", () => {
    // @ts-expect-error — deliberately outside the ModuleId union
    expect(() => getModule("nope")).toThrow(/Unknown module/);
  });
});

describe("moduleSchema", () => {
  const valid = { id: "voice", name: "Voice", summary: "s", phase: 2, state: "planned", statusText: "Phase 2" };

  it("accepts a well-formed module", () => {
    expect(moduleSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an unknown state", () => {
    expect(moduleSchema.safeParse({ ...valid, state: "busy" }).success).toBe(false);
  });
  it("rejects a route that is not absolute", () => {
    expect(moduleSchema.safeParse({ ...valid, href: "voice" }).success).toBe(false);
  });
  it("rejects phase 0 and fractional phases", () => {
    expect(moduleSchema.safeParse({ ...valid, phase: 0 }).success).toBe(false);
    expect(moduleSchema.safeParse({ ...valid, phase: 1.5 }).success).toBe(false);
  });
});
