// One question from the resolver, shown to the players: its words, the enemy units it is about as chips with their key figures, and
// the controls for the reply (distance steppers, ticks, Yes and No, or a choice). Nothing is asked twice; the page merges each reply
// into the game's sheet and asks the resolver again.
import { useState } from "react";
import { questionText } from "../../rules/aces-resolve";
import type { Question, Reply } from "../../rules/aces-resolve";

export interface UnitChip {
  name: string;
  /** Its key figures, such as "Armor 3, Structure 2, moved: Ground, TMM 2". */
  facts: string;
}

interface Props {
  question: Question;
  describe: (id: string) => UnitChip;
  onReply: (reply: Reply) => void;
}

function Chip({ chip }: { chip: UnitChip }) {
  return (
    <span className="aces-unit">
      <strong>{chip.name}</strong>
      <span className="aces-unit__facts">{chip.facts}</span>
    </span>
  );
}

function Distances({ question, describe, onReply }: Props & { question: Extract<Question, { kind: "distances" }> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(question.unitIds.map((id) => [id, question.prefill[id] === undefined ? "" : String(question.prefill[id])])));
  const [problem, setProblem] = useState("");
  const step = (id: string, by: number) => {
    const now = Number.parseFloat(values[id] ?? "");
    setValues({ ...values, [id]: String(Math.max(0, (Number.isFinite(now) ? now : 0) + by)) });
  };
  const send = () => {
    const inches: Record<string, number> = {};
    for (const id of question.unitIds) {
      const n = Number.parseFloat(values[id] ?? "");
      if (!Number.isFinite(n) || n < 0) {
        setProblem("Enter a distance of 0 or more for every unit, in inches. Base contact is 0.");
        return;
      }
      inches[id] = n;
    }
    onReply({ kind: "distances", inches });
  };
  return (
    <>
      <ul className="bt-list">
        {question.unitIds.map((id) => {
          const chip = describe(id);
          return (
            <li key={id} className="bt-row aces-question__row">
              <Chip chip={chip} />
              <span className="aces-stepper__row">
                <button type="button" className="bt-button bt-button--secondary aces-stepper__button" aria-label={`One inch less for ${chip.name}`} onClick={() => { step(id, -1); }}>
                  -
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="aces-stepper__input"
                  aria-label={`Distance to ${chip.name}, in inches`}
                  value={values[id] ?? ""}
                  onChange={(e) => { setValues({ ...values, [id]: e.target.value }); }}
                />
                <button type="button" className="bt-button bt-button--secondary aces-stepper__button" aria-label={`One inch more for ${chip.name}`} onClick={() => { step(id, 1); }}>
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <button type="button" className="bt-button" onClick={send}>
        Done with distances
      </button>
    </>
  );
}

function Ticks({ question, describe, onReply }: Props & { question: Extract<Question, { kind: "sight" | "pick-units" }> }) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <>
      <ul className="bt-list">
        {question.unitIds.map((id) => {
          const chip = describe(id);
          const on = picked.includes(id);
          return (
            <li key={id} className="bt-row">
              <label className="bt-check aces-question__tick" htmlFor={`q-${question.key}-${id}`}>
                <input id={`q-${question.key}-${id}`} type="checkbox" checked={on} onChange={(e) => { setPicked(e.target.checked ? [...picked, id] : picked.filter((x) => x !== id)); }} />
                <Chip chip={chip} />
              </label>
            </li>
          );
        })}
      </ul>
      <button type="button" className="bt-button" onClick={() => { onReply(question.kind === "sight" ? { kind: "sight", seen: picked } : { kind: "pick-units", picked }); }}>
        {picked.length === 0 ? "None of them" : "Done"}
      </button>
    </>
  );
}

export default function QuestionView(props: Props) {
  const { question, describe, onReply } = props;
  return (
    <section className="aces-question" aria-label="Question">
      <p className="aces-question__text">{questionText(question)}</p>
      <p className="bt-hint">{question.cite}</p>
      {question.kind === "distances" && <Distances key={question.key} {...props} question={question} />}
      {(question.kind === "sight" || question.kind === "pick-units") && <Ticks key={`${question.key}:${question.unitIds.join(",")}`} {...props} question={question} />}
      {question.kind === "yes-no" && (
        <p className="aces-question__buttons">
          <button type="button" className="bt-button" onClick={() => { onReply({ kind: "yes-no", yes: true }); }}>
            Yes
          </button>
          <button type="button" className="bt-button" onClick={() => { onReply({ kind: "yes-no", yes: false }); }}>
            No
          </button>
        </p>
      )}
      {question.kind === "pick-one" && (
        <ul className="bt-list">
          {question.unitIds.map((id) => {
            const chip = describe(id);
            return (
              <li key={id} className="bt-row">
                <Chip chip={chip} />
                <button type="button" className="bt-button" aria-label={`Choose ${chip.name}`} onClick={() => { onReply({ kind: "pick-one", chosen: id }); }}>
                  Choose
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
