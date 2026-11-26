// A saved 'Mech that the editor or the sheet cannot show must never blank the page or trap the player behind it. The page
// says which record it is, offers a copy of what is stored (to keep or to send in) and offers to delete it.
import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { baseOf, gameOfPath, RULESETS } from "../data/rulesets";
import { downloadJson, openFamilyStorage } from "./storage";

function Failure({ id, message }: { id: string; message: string }) {
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const game = gameOfPath(useLocation().pathname);
  const home = `${baseOf(game)}/home`;

  const exportRaw = async () => {
    try {
      const stored = await (await openFamilyStorage()).raw(id);
      downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "mech"}.raw.json`, stored ?? null);
      setStatus("Export started.");
    } catch {
      setStatus("We could not read that record to export it.");
    }
  };
  const remove = async () => {
    try {
      await (await openFamilyStorage()).remove(id);
      void navigate(home);
    } catch {
      setConfirming(false);
      setStatus("We could not delete that record.");
    }
  };

  return (
    <div className="sr-page">
      <h1>This 'Mech could not be shown</h1>
      <p>
        Something in the saved 'Mech stopped this page from drawing. Nothing has been changed or lost. You can keep a copy of exactly what is
        saved, or delete the 'Mech.
      </p>
      <p>
        Record id: <code>{id || "(none)"}</code>
      </p>
      <p className="bt-hint">{message}</p>
      <p className="bt-actions">
        <button type="button" className="bt-button" onClick={() => void exportRaw()}>
          Export raw record
        </button>
        {confirming ? (
          <>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => void remove()}>
              Delete it for good
            </button>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bt-button bt-button--secondary"
            onClick={() => {
              setConfirming(true);
            }}
          >
            Delete this record
          </button>
        )}
        <Link className="bt-button bt-button--secondary" to={home}>
          Back to {RULESETS[game].name}
        </Link>
      </p>
      <p role="status">{status}</p>
    </div>
  );
}

export default class RecordBoundary extends Component<{ id: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    return this.state.error ? <Failure id={this.props.id} message={this.state.error.message} /> : this.props.children;
  }
}
