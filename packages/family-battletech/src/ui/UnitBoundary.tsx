// A saved unit that a page cannot show must never blank the page or trap the player behind it: the page says which record it
// is, offers a copy of what is stored, and a way back. Each unit type names itself, its home and its store. (The 'Mech pages
// have their own, RecordBoundary, which also offers to delete the record.)
import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { downloadJson } from "./storage";

export interface UnitBoundaryProps {
  id: string;
  /** How the heading names the unit: "This <unit> could not be shown". */
  unit: string;
  home: string;
  /** The game the way back names; Classic BattleTech unless said. */
  game?: string;
  /** The unit type's store: what is saved under an id exactly as it is, and removing it. */
  open: () => Promise<{ raw(id: string): Promise<unknown>; remove(id: string): Promise<void> }>;
  children: ReactNode;
}

function Failure({ id, unit, home, game = "Classic BattleTech", open, message }: Omit<UnitBoundaryProps, "children"> & { message: string }) {
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const remove = async () => {
    try {
      await (await open()).remove(id);
      void navigate(home);
    } catch {
      setConfirming(false);
      setStatus("We could not delete that record.");
    }
  };
  const exportRaw = async () => {
    try {
      downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "unit"}.raw.json`, (await (await open()).raw(id)) ?? null);
      setStatus("Export started.");
    } catch {
      setStatus("We could not read that record to export it.");
    }
  };
  return (
    <div className="sr-page">
      <h1>{`This ${unit} could not be shown`}</h1>
      <p>Something in the saved unit stopped this page from drawing. Nothing has been changed or lost. You can keep a copy of exactly what is saved, or delete the record.</p>
      <p>
        Record id: <code>{id || "(none)"}</code>
      </p>
      <p className="bt-hint">{message}</p>
      <p className="bt-actions">
        <button type="button" className="bt-button" onClick={() => { void exportRaw(); }}>
          Export raw record
        </button>
        {confirming ? (
          <>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { void remove(); }}>
              Delete it for good
            </button>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirming(false); }}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className="bt-button bt-button--secondary" disabled={id === ""} onClick={() => { setConfirming(true); }}>
            Delete this record
          </button>
        )}
        <Link className="bt-button bt-button--secondary" to={home}>
          {`Back to ${game}`}
        </Link>
      </p>
      <p role="status">{status}</p>
    </div>
  );
}

export default class UnitBoundary extends Component<UnitBoundaryProps, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    const { children, ...rest } = this.props;
    return this.state.error ? <Failure {...rest} message={this.state.error.message} /> : children;
  }
}
