import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { checkBa } from "./battlearmor/checks";
import { build } from "./battlearmor/construct";
import { newBaRecord } from "./battlearmor/record";
import { priceOf } from "./cost";

const catalog = await loadCatalog();
const mount = (id: string, location = "body") => ({ id: `m-${id}-${location}`, equipmentId: id, name: id, location });

// Battle armor items of fixed weight in the TechManual tables (printed pp. 346-348, prices and dates p. 298): id, tons, price, first year.
describe("battle armor fixed-weight items (TechManual pp. 298, 346-348)", () => {
  it.each([
    ["ba-parafoil-is", 0.035, 3_000, 1950],
    ["ba-power-pack-clan", 0.025, 1_000, 1950],
    ["ba-remote-sensor-dispenser-is", 0.04, 7_500, 3050],
    ["ba-searchlight-is", 0.005, 500, 1950],
    ["ba-shotgun-microphone-clan", 0.005, 750, 1950],
    ["ba-space-operations-adaptation-is", 0.1, 50_000, 3011],
    ["ba-space-operations-adaptation-clan", 0.1, 50_000, 2895],
    ["ba-light-tag-is", 0.035, 40_000, 3053],
    ["ba-light-tag-clan", 0.035, 40_000, 3054],
    ["ba-partial-wing-is", 0.2, 50_000, 3053],
  ])("%s weighs, costs and dates as the tables print", (id, tons, price, from) => {
    const row = catalog.byId(id);
    expect(row).toMatchObject({ tons, slots: 1, units: ["battlearmor"], availability: [{ from }] });
    expect(row && priceOf(row)?.price).toBe(price);
  });
});

describe("battle armor parafoil, remote sensor dispenser and partial wing rules", () => {
  const record = (mounts: ReturnType<typeof mount>[], motive = { kind: "jump", mp: 2 }) => ({ ...newBaRecord({ weightClass: "medium", year: 3070 }), motive, mounts });
  const errors = (r: ReturnType<typeof record>) => checkBa(r, catalog).filter((f) => f.level === "error").map((f) => f.message);

  it("allows one parafoil, in the Body only, and one remote sensor dispenser", () => {
    expect(errors(record([mount("ba-parafoil-is"), mount("ba-remote-sensor-dispenser-is")]))).toEqual([]);
    expect(errors(record([mount("ba-parafoil-is", "ra")]))).toContain("A parafoil can only be mounted in the Body.");
    expect(errors(record([mount("ba-parafoil-is"), mount("ba-parafoil-is", "la")]))).toContain("A suit may mount only one parafoil.");
    expect(errors(record([mount("ba-remote-sensor-dispenser-is"), mount("ba-remote-sensor-dispenser-is", "la")]))).toContain("A suit may mount only one remote sensor dispenser.");
  });

  it("adds a Jumping MP for a partial wing, which needs jump jets and never goes with a jump booster", () => {
    expect(build(record([mount("ba-partial-wing-is")]), catalog).moves.jump).toBe(3);
    expect(errors(record([mount("ba-partial-wing-is")], { kind: "none", mp: 0 }))).toContain("A partial wing needs jump jets.");
    expect(errors(record([mount("ba-partial-wing-is"), mount("ba-jump-booster-is")]))).toContain("A partial wing and a jump booster cannot be combined.");
  });
});
