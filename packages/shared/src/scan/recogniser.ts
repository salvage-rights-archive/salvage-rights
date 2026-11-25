import type { DigitsField, Raster, TextField } from "./types";

export interface Recognised {
  text: string;
  /** 0 to 1. */
  confidence: number;
}

/**
 * Reads a cropped picture of one digits or text field. The engine ships no reader of its own: a later piece plugs a
 * text recogniser in here, and tests use `fakeRecogniser`.
 */
export interface Recogniser {
  recognise(field: DigitsField | TextField, crop: Raster): Promise<Recognised>;
}

/** A recogniser that answers from a table by field id; a field not in the table reads as empty with no confidence. */
export function fakeRecogniser(answers: Record<string, Recognised>): Recogniser {
  return {
    async recognise(field) {
      return answers[field.id] ?? { text: "", confidence: 0 };
    },
  };
}
