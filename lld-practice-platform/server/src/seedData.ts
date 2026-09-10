import { Problem } from "./domain/types.js";

const now = new Date().toISOString();

export const seedProblems: Problem[] = [
  {
    id: "parking-lot",
    title: "Design a Parking Lot",
    difficulty: "easy",
    tags: ["oop-basics", "strategy-pattern"],
    createdAt: now,
    statement:
      "Design a multi-level parking lot system that can park and unpark vehicles of different types " +
      "(motorcycle, car, bus), track available spots per level, and compute a parking fee when a vehicle leaves.",
    functionalRequirements: [
      "Support at least 3 vehicle types with different spot-size needs.",
      "Assign a vehicle to an available, appropriately-sized spot on entry.",
      "Free the spot and compute a fee based on duration when a vehicle exits.",
      "Report available spot counts per level and per spot type.",
    ],
    nonFunctionalRequirements: [
      "New vehicle types or pricing schemes should be addable without rewriting core allocation logic.",
      "Should behave correctly with concurrent entries at different gates (conceptually — no need to implement real concurrency control).",
    ],
    requiredElements: [
      {
        id: "spot",
        kind: "class",
        name: "ParkingSpot",
        hint: "represents one physical spot, with a size/type and occupied state",
        keywords: ["parkingspot", "spot", "slot"],
      },
      {
        id: "vehicle",
        kind: "class",
        name: "Vehicle",
        hint: "base type/hierarchy for Car, Bus, Motorcycle so allocation logic doesn't special-case each type",
        keywords: ["vehicle", "car", "bus", "motorcycle"],
      },
      {
        id: "pricing-strategy",
        kind: "interface",
        name: "PricingStrategy",
        hint: "so fee calculation can change (flat, hourly, dynamic) without touching the parking flow",
        keywords: ["pricingstrategy", "pricing", "fee", "strategy"],
      },
      {
        id: "allocation",
        kind: "rule",
        name: "Spot allocation rule",
        hint: "how a vehicle is matched to a spot size (e.g. a motorcycle should not consume a bus-sized spot unless necessary)",
        keywords: ["allocat", "assign", "match"],
      },
      {
        id: "lot-level-relationship",
        kind: "relationship",
        name: "ParkingLot has Levels has Spots",
        hint: "a clear containment hierarchy so 'find nearest available spot' has an obvious place to live",
        keywords: ["level", "floor", "parkinglot"],
      },
    ],
    rubric: [
      { id: "responsibility", label: "Responsibility separation", description: "Each class has one clear job (allocation vs pricing vs vehicle identity).", weight: 0.3 },
      { id: "extensibility", label: "Extensibility", description: "New vehicle types or pricing models can be added with minimal changes.", weight: 0.3 },
      { id: "correctness", label: "Correctness", description: "The design actually satisfies park/unpark/fee requirements without gaps.", weight: 0.25 },
      { id: "clarity", label: "Clarity", description: "Class/interface names and relationships are understandable at a glance.", weight: 0.15 },
    ],
  },
  {
    id: "elevator-system",
    title: "Design an Elevator System",
    difficulty: "medium",
    tags: ["state-machine", "scheduling"],
    createdAt: now,
    statement:
      "Design the control system for a bank of elevators in a building: handle floor requests from inside " +
      "and outside the elevator, decide which elevator services which request, and manage each elevator's " +
      "movement state.",
    functionalRequirements: [
      "Support multiple elevators servicing the same set of floors.",
      "Accept external requests (floor + direction) and internal requests (destination floor from inside a car).",
      "Decide which elevator should service a given external request.",
      "Track each elevator's current floor, direction, and door state over time.",
    ],
    nonFunctionalRequirements: [
      "The scheduling/dispatch strategy should be swappable (e.g. nearest-car vs zone-based) without changing the elevator's own state handling.",
      "Should reason sensibly about concurrent requests arriving while a car is mid-trip.",
    ],
    requiredElements: [
      {
        id: "elevator-state",
        kind: "class",
        name: "Elevator",
        hint: "owns its own state (current floor, direction, door status, request queue)",
        keywords: ["elevator", "car"],
      },
      {
        id: "dispatch-strategy",
        kind: "interface",
        name: "DispatchStrategy",
        hint: "decides which elevator services an external request, decoupled from Elevator itself",
        keywords: ["dispatch", "scheduler", "strategy", "assign"],
      },
      {
        id: "request",
        kind: "class",
        name: "Request",
        hint: "a small value type distinguishing internal (destination) vs external (floor+direction) requests",
        keywords: ["request", "hallcall", "cabincall"],
      },
      {
        id: "state-machine",
        kind: "rule",
        name: "Movement state transitions",
        hint: "explicit states (idle/moving up/moving down/door open) and rules for transitioning between them",
        keywords: ["idle", "moving", "direction", "state"],
      },
      {
        id: "controller",
        kind: "relationship",
        name: "Controller coordinates Elevators via DispatchStrategy",
        hint: "a coordinating class so elevators don't need to know about each other directly",
        keywords: ["controller", "system", "coordinator"],
      },
    ],
    rubric: [
      { id: "responsibility", label: "Responsibility separation", description: "Dispatch logic is decoupled from an individual elevator's state handling.", weight: 0.3 },
      { id: "extensibility", label: "Extensibility", description: "A new dispatch strategy could be swapped in without touching Elevator.", weight: 0.3 },
      { id: "correctness", label: "Correctness", description: "Internal vs external requests and state transitions are handled coherently.", weight: 0.25 },
      { id: "clarity", label: "Clarity", description: "The design is easy to explain and reason about.", weight: 0.15 },
    ],
  },
  {
    id: "vending-machine",
    title: "Design a Vending Machine",
    difficulty: "easy",
    tags: ["state-pattern"],
    createdAt: now,
    statement:
      "Design a vending machine that accepts coins/notes, lets a user select a product, dispenses the " +
      "product and change if the product is in stock and enough money was inserted, and handles cancellation.",
    functionalRequirements: [
      "Track inventory per product slot, including out-of-stock handling.",
      "Accept incremental payment and compute change (or reject/refund if insufficient after a timeout/cancel).",
      "Support selecting a product before or after inserting money, in a sensible order.",
      "Dispense product + change and return to a ready state for the next customer.",
    ],
    nonFunctionalRequirements: [
      "Invalid transitions (e.g. dispensing with no product selected) should be structurally hard to trigger, not just checked with if-statements scattered around.",
      "Adding a new payment method (e.g. card) later shouldn't require rewriting the core flow.",
    ],
    requiredElements: [
      {
        id: "state-pattern",
        kind: "class",
        name: "VendingMachineState",
        hint: "explicit states (Idle, HasMoney, Dispensing, OutOfStock) rather than boolean flags",
        keywords: ["state", "idle", "dispensing"],
      },
      {
        id: "inventory",
        kind: "class",
        name: "Inventory",
        hint: "owns stock levels per product slot, separate from payment/state handling",
        keywords: ["inventory", "stock", "slot"],
      },
      {
        id: "payment",
        kind: "interface",
        name: "PaymentStrategy",
        hint: "so a new payment method can be added without rewriting the core dispense flow",
        keywords: ["payment", "coin", "cash", "card"],
      },
      {
        id: "change-rule",
        kind: "rule",
        name: "Change calculation",
        hint: "clear rule for computing change and what happens if exact change isn't available",
        keywords: ["change", "refund"],
      },
    ],
    rubric: [
      { id: "responsibility", label: "Responsibility separation", description: "State/inventory/payment are separate concerns.", weight: 0.3 },
      { id: "extensibility", label: "Extensibility", description: "New payment methods or products can be added cleanly.", weight: 0.3 },
      { id: "correctness", label: "Correctness", description: "Edge cases (out of stock, insufficient payment, cancellation) are actually handled.", weight: 0.25 },
      { id: "clarity", label: "Clarity", description: "States and transitions are explicit and easy to follow.", weight: 0.15 },
    ],
  },
];
