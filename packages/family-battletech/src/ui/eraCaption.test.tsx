import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ERAS } from "../data/editions";
import { eraChoice } from "./eraChoice";
import { eraCaptionText } from "./eraCaption";
import { SelectField } from "./aero/fields";

afterEach(cleanup);

const era = (id: string) => {
  const row = ERAS.find((r) => r.id === id);
  if (!row) throw new Error("era missing");
  return row;
};
const select = (caption: string | undefined, id = "late-succession-war-renaissance") => {
  const options = [{ value: "", label: "Any era" }, eraChoice(era(id), 2)];
  render(<SelectField id="era" label="Era" value={caption ? id : ""} options={options} onChange={() => undefined} caption={caption} />);
  return screen.getByLabelText("Era");
};

describe("the era caption", () => {
  it("gives the era's full label and years, and for an open-ended era says from the first year", () => {
    expect(eraCaptionText(era("late-succession-war-renaissance"))).toBe("Late Succession War - Renaissance (3020-3049)");
    const open = ERAS.find((r) => r.endYear === undefined);
    if (!open) throw new Error("no open-ended era");
    expect(eraCaptionText(open)).toBe(`${open.name} (from ${String(open.startYear)})`);
  });

  it("shows under the select, which it describes, when an era is chosen", () => {
    const el = select(eraCaptionText(era("late-succession-war-renaissance")));
    expect(screen.getByText("Late Succession War - Renaissance (3020-3049)").id).toBe("era-caption");
    expect(el.getAttribute("aria-describedby")).toBe("era-caption");
  });

  it("is absent, with nothing described, when no era is chosen", () => {
    const el = select(eraCaptionText(undefined));
    expect(document.querySelector(".bt-era-caption")).toBeNull();
    expect(el.hasAttribute("aria-describedby")).toBe(false);
  });
});
