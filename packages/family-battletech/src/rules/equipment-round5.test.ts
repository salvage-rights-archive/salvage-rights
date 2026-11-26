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

// Battle armor versions of TO:AUE items (printed p. 225): id, tons, slots, price, first year, rules level.
describe("battle armor versions of Tactical Operations items (TO:AUE p. 225)", () => {
  it.each([
    ["ba-heavy-flamer-is", 0.35, 2, 11_250, 3073, "advanced"],
    ["ba-er-pulse-laser-medium-clan", 0.8, 4, 150_000, 3059, "experimental"],
    ["ba-variable-speed-laser-small-is", 0.5, 2, 60_000, 3071, "advanced"],
    ["ba-taser-is", 0.3, 3, 10_000, 3067, "advanced"],
    ["ba-angel-ecm-clan", 0.15, 3, 750_000, 3059, "experimental"],
    ["ba-c3i-is", 0.35, 1, 125_000, 3063, "experimental"],
  ])("%s weighs, costs and dates as the table prints", (id, tons, slots, price, from, rulesLevel) => {
    const row = catalog.byId(id);
    expect(row).toMatchObject({ tons, slots, units: ["battlearmor"], availability: [{ from }], rulesLevel });
    expect(row && priceOf(row)?.price).toBe(price);
  });
});

// Conventional infantry weapons where IO:AE (third printing, printed pp. 48-49, Production column) is later than the TechManual table (sixth printing): id, availability.
describe("infantry weapon years follow the later printing (IO:AE pp. 48-49 over TechManual p. 299)", () => {
  it.each([
    ["inf-whip-neural-lash-is", [{ from: 2320 }]],
    ["inf-whip-neural-whip-is", [{ from: 2325 }]],
    ["inf-whip-neural-whip-clan", [{ from: 2325, to: 2786 }]],
    ["inf-gyrojet-pistol-coventry-handrocket-is", [{ from: 3052 }]],
    ["inf-laser-rifle-marx-xx-is", [{ from: 2670 }]],
  ])("%s", (id, availability) => {
    expect(catalog.byId(id)?.availability).toEqual(availability);
  });
});

describe("battle armor parafoil, remote sensor dispenser and partial wing rules", () => {
  const record = (mounts: ReturnType<typeof mount>[], motive = { kind: "jump", mp: 2 }) => ({ ...newBaRecord({ weightClass: "light", year: 3070 }), motive, mounts });
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
    expect(errors(record([mount("ba-partial-wing-is", "ra")]))).toContain("A partial wing can only be mounted in the Body.");
    const medium = { ...record([mount("ba-partial-wing-is")]), weightClass: "medium" };
    expect(errors(medium)).toContain("A partial wing fits only humanoid light suits and PA(L) or exoskeleton suits.");
  });
});
