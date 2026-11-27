import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { newBaRecord } from "../rules/battlearmor/record";
import { newSvRecord } from "../rules/support-vehicle/sv";
import { newVehicleRecord } from "../rules/vehicle/vehicle";
import { IdentityPanel as BaIdentity } from "./battlearmor/BaPanels";
import { IdentityPanel as SvIdentity } from "./support-vehicle/SvParts";
import { IdentityPanel as VehicleIdentity } from "./vehicle/VehicleParts";

afterEach(cleanup);

type Record = ReturnType<typeof newVehicleRecord>;
function Vehicle({ start }: { start: Record }) {
  const [record, setRecord] = useState(start);
  return <VehicleIdentity record={record} onEdit={(change) => { setRecord((now) => { const next = structuredClone(now); change(next); return next; }); }} />;
}
const vehicle = (fields: Partial<Parameters<typeof newVehicleRecord>[0]> = {}) => newVehicleRecord({ motive: "tracked", tons: 50, rulesLevel: "advanced", ...fields });

describe("the Year and Era pair in a unit editor's Identity panel", () => {
  it("puts Era, always a select, beside Year and after the rules level, in the Battle Armor, Support Vehicle and Vehicle editors", () => {
    const noop = () => undefined;
    for (const panel of [
      <BaIdentity key="ba" record={newBaRecord({ weightClass: "medium", year: 3060 })} onEdit={noop} />,
      <SvIdentity key="sv" record={newSvRecord({ motive: "tracked", tons: 20, year: 3060 })} onEdit={noop} />,
      <VehicleIdentity key="vehicle" record={vehicle({ year: 3060 })} onEdit={noop} />,
    ]) {
      const { container, unmount } = render(panel);
      const pair = container.querySelector(".bt-yearera");
      expect(pair?.querySelector("input#field-year")).not.toBeNull();
      expect(pair?.querySelector("select#field-era")).not.toBeNull();
      const order = [...container.querySelectorAll("select, input")].map((el) => el.id);
      expect(order.indexOf("field-year")).toBeGreaterThan(order.findIndex((id) => id.includes("level")));
      expect(order.indexOf("field-year")).toBeLessThan(order.indexOf("field-techBase"));
      unmount();
    }
  });

  it("takes the era from the year by the tech base, and a changed tech base picks again", async () => {
    const user = userEvent.setup();
    render(<Vehicle start={vehicle()} />);
    await user.type(screen.getByLabelText("Year"), "3140");
    const era = screen.getByLabelText("Era");
    expect((era as HTMLSelectElement).value).toBe("dark-ages");
    await user.selectOptions(screen.getByLabelText("Tech base"), "clan");
    expect((era as HTMLSelectElement).value).toBe("clan-post-reaving");
    await user.selectOptions(screen.getByLabelText("Tech base"), "inner-sphere");
    expect((era as HTMLSelectElement).value).toBe("dark-ages");
  });

  it("fills the year with the mean of an era chosen, leaves the year when no era is chosen, and shows the era in full under the select", async () => {
    const user = userEvent.setup();
    render(<Vehicle start={vehicle()} />);
    await user.selectOptions(screen.getByLabelText("Era"), "late-succession-war-renaissance");
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("3035");
    expect(document.getElementById("field-era-caption")?.textContent).toBe("Late Succession War - Renaissance (3020-3049)");
    await user.selectOptions(screen.getByLabelText("Era"), "");
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("3035");
    expect(document.querySelector(".bt-era-caption")).toBeNull();
  });
});
