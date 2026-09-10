import { describe, expect, it } from "vitest";
import { DeterministicEvaluator } from "../src/evaluators/DeterministicEvaluator.js";
import { formatHandlers } from "../src/formats/SubmissionFormatHandler.js";
import { seedProblems } from "../src/seedData.js";

const parkingLot = seedProblems.find((p) => p.id === "parking-lot")!;
const evaluator = new DeterministicEvaluator();

describe("DeterministicEvaluator", () => {
  it("flags all required elements as missing for an empty/trivial submission", async () => {
    const normalized = formatHandlers.text.normalize("I will design a parking lot.");
    const result = await evaluator.evaluate(parkingLot, normalized);

    const elementFindings = result.findings.filter((f) => f.criterionId !== "structure");
    expect(elementFindings.every((f) => !f.passed)).toBe(true);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it("marks an element as found when its keyword appears in free text", async () => {
    const text =
      "I'll use a PricingStrategy interface so fee calculation can vary, and a ParkingSpot class per bay, " +
      "with Vehicle as a base type for Car/Bus/Motorcycle. The ParkingLot contains Levels which contain Spots. " +
      "Allocation matches vehicle size to spot size.";
    const normalized = formatHandlers.text.normalize(text);
    const result = await evaluator.evaluate(parkingLot, normalized);

    const byId = new Map(result.findings.map((f) => [f.criterionId, f]));
    expect(byId.get("pricing-strategy")?.passed).toBe(true);
    expect(byId.get("spot")?.passed).toBe(true);
    expect(byId.get("vehicle")?.passed).toBe(true);
  });

  it("detects declared class names from code submissions even without matching keywords elsewhere", async () => {
    const code = `
      class ParkingSpot {}
      class Vehicle {}
      interface PricingStrategy {}
    `;
    const normalized = formatHandlers.code.normalize(code);
    expect(normalized.declaredTypes).toContain("ParkingSpot");
    expect(normalized.declaredTypes).toContain("PricingStrategy");

    const result = await evaluator.evaluate(parkingLot, normalized);
    const byId = new Map(result.findings.map((f) => [f.criterionId, f]));
    expect(byId.get("spot")?.passed).toBe(true);
    expect(byId.get("pricing-strategy")?.passed).toBe(true);
  });

  it("flags very short submissions as structurally insufficient", async () => {
    const normalized = formatHandlers.text.normalize("Use a class.");
    const result = await evaluator.evaluate(parkingLot, normalized);
    const structureFinding = result.findings.find((f) => f.criterionId === "structure");
    expect(structureFinding?.passed).toBe(false);
  });

  it("parses a diagram submission's classes and edges", async () => {
    const diagram = JSON.stringify({
      classes: [{ name: "ParkingSpot", methods: ["isOccupied"] }, { name: "Vehicle", methods: [] }],
      edges: [{ from: "ParkingLot", to: "ParkingSpot", type: "contains" }],
    });
    const normalized = formatHandlers.diagram.normalize(diagram);
    expect(normalized.declaredTypes).toEqual(["ParkingSpot", "Vehicle"]);

    const result = await evaluator.evaluate(parkingLot, normalized);
    const byId = new Map(result.findings.map((f) => [f.criterionId, f]));
    expect(byId.get("spot")?.passed).toBe(true);
  });

  it("does not throw on malformed diagram JSON, and treats it as failing coverage", async () => {
    const normalized = formatHandlers.diagram.normalize("{not valid json");
    const result = await evaluator.evaluate(parkingLot, normalized);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
