// The line under an Era drop-down that says, in full, which era is chosen. A drop-down cannot wrap its closed text, so on a phone the choice
// is shortened and this caption carries the whole name and years. It is the select's description (aria-describedby), not part of its name.
import type { EraRow } from "../data/editions";
import { eraFull } from "./eraChoice";

/** The caption's id for a select with this id. */
export const eraCaptionId = (selectId: string): string => `${selectId}-caption`;

/** The caption's text for the era chosen: "Late Succession War - Renaissance (3020-3049)"; nothing when no era is chosen. */
export const eraCaptionText = (era: EraRow | undefined): string | undefined => (era ? eraFull(era) : undefined);

/** The caption itself; renders nothing without text. It wraps over as many lines as it needs. */
export function EraCaption({ id, text }: { id: string; text: string | undefined }) {
  return text ? (
    <span id={eraCaptionId(id)} className="bt-hint bt-era-caption">
      {text}
    </span>
  ) : null;
}
