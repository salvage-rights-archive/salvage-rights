import { useEffect, useRef, useState } from "react";
import {
  cropRaster,
  detectCore,
  filesForDevice,
  keepButton,
  keepReader,
  loadImage,
  megabytes,
  ocrPaths,
  readKeepState,
  readOcrManifest,
  scanCard,
  sizeForDevice,
  tesseractRecogniser,
} from "@salvage-rights/shared";
import type { CardLayout, CoreKind, FieldResult, KeepState, OcrManifest, Raster, ScanOutcome, TesseractRecogniser } from "@salvage-rights/shared";
import { TEST_CARD_LAYOUT, drawTestCard } from "./test-card-drawing";

/** The site's base address, taken from where this page is served (`<base>example/scan-test`). Dev edition only. */
function siteBase(): string {
  const at = location.pathname.indexOf("/example/");
  return `${location.origin}${at < 0 ? "/" : location.pathname.slice(0, at + 1)}`;
}

const WHOLE_PHOTO_LAYOUT: CardLayout = {
  id: "whole-photo",
  width: 1050,
  height: 750,
  fields: [{ id: "text", kind: "text", rect: { x: 0, y: 0, w: 1, h: 1 } }],
};

type LayoutChoice = "test-card" | "whole-photo" | "custom";

function parseLayout(text: string): CardLayout | string {
  try {
    const value = JSON.parse(text) as Partial<CardLayout>;
    if (typeof value.width !== "number" || typeof value.height !== "number" || !Array.isArray(value.fields)) {
      return "A layout needs a width, a height and a list of fields.";
    }
    return value as CardLayout;
  } catch {
    return "That layout is not valid JSON.";
  }
}

function CropPicture({ raster, label }: { raster: Raster; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    context.putImageData(new ImageData(raster.data as Uint8ClampedArray<ArrayBuffer>, raster.width, raster.height), 0, 0);
  }, [raster]);
  return <canvas ref={ref} role="img" aria-label={label} style={{ maxWidth: "100%", height: "auto", border: "1px solid currentColor" }} />;
}

export default function ScanTestPage() {
  const [manifest, setManifest] = useState<OcrManifest | null | undefined>(undefined);
  const [core, setCore] = useState<CoreKind>("plain");
  const [keep, setKeep] = useState<KeepState>("not-kept");
  const [progress, setProgress] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [photo, setPhoto] = useState<{ raster: Raster; name: string } | null>(null);
  const [layoutChoice, setLayoutChoice] = useState<LayoutChoice>("test-card");
  const [customLayout, setCustomLayout] = useState(JSON.stringify(TEST_CARD_LAYOUT, null, 2));
  const [wholePhoto, setWholePhoto] = useState(false);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<Extract<ScanOutcome, { ok: true }> | null>(null);
  const [reading, setReading] = useState(false);
  const recogniser = useRef<TesseractRecogniser | null>(null);
  const base = siteBase();

  // Only the small manifest is fetched here; none of the reader's own files load until Read is pressed.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const found = await readOcrManifest(base);
      const kind = await detectCore();
      if (!alive) return;
      setCore(kind);
      setManifest(found);
      if (found) setKeep(await readKeepState(found, filesForDevice(found, base, kind), typeof caches === "undefined" ? undefined : caches));
    })();
    const up = () => {
      setOnline(true);
    };
    const down = () => {
      setOnline(false);
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      alive = false;
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      void recogniser.current?.close();
    };
  }, [base]);

  const size = manifest ? megabytes(sizeForDevice(manifest, core)) : "";
  const button = keepButton(manifest === null || manifest === undefined ? "unavailable" : keep, size, online);

  async function keepOnDevice() {
    if (!manifest) return;
    setKeep("keeping");
    try {
      await keepReader(manifest, filesForDevice(manifest, base, core), caches, (done, total) => {
        setProgress(`${String(done)} of ${String(total)} files`);
      });
      setKeep("kept");
    } catch (error) {
      setKeep("failed");
      setMessage(error instanceof Error ? error.message : "The card reader could not be kept.");
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setMessage("");
    setOutcome(null);
    try {
      setPhoto({ raster: await loadImage(file), name: file.name });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not open that file.");
    }
  }

  async function read() {
    if (!photo || !manifest) return;
    const layout = layoutChoice === "test-card" ? TEST_CARD_LAYOUT : layoutChoice === "whole-photo" ? WHOLE_PHOTO_LAYOUT : parseLayout(customLayout);
    if (typeof layout === "string") {
      setMessage(layout);
      return;
    }
    setMessage("");
    setReading(true);
    setStatus("Starting the card reader…");
    recogniser.current ??= tesseractRecogniser({
      paths: ocrPaths(manifest, base),
      onStatus: (what, fraction) => {
        setStatus(`${what} ${String(Math.round(fraction * 100))}%`);
      },
    });
    try {
      const result = await scanCard(photo.raster, layout, { recogniser: recogniser.current, wholePhoto });
      if (result.ok) {
        setOutcome(result);
        setStatus("Done.");
      } else {
        setOutcome(null);
        setMessage(result.message);
        setStatus("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The card reader failed.");
      setStatus("");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="sr-page">
      <h1>Card reader test</h1>
      <p>
        Try the card reader on a photo. It runs on this device; the photo and what is read are not sent anywhere. The reader&apos;s
        files are fetched only when you press Read.
      </p>

      <h2>Reader files</h2>
      {manifest === undefined && <p role="status">Checking the reader…</p>}
      {manifest === null && <p>This build has no card reader files.</p>}
      {manifest && (
        <p>
          <button type="button" className="sr-action" disabled={button.disabled} onClick={() => void keepOnDevice()}>
            {button.label}
          </button>{" "}
          <span role="status">{keep === "keeping" ? `${button.note} ${progress}` : button.note}</span>
        </p>
      )}

      <h2>Photo and layout</h2>
      <p>
        <label>
          Photo of a card <input type="file" accept="image/*" onChange={(event) => void pick(event.target.files?.[0])} />
        </label>
      </p>
      <p>
        <button
          type="button"
          className="sr-action"
          onClick={() => {
            setOutcome(null);
            setMessage("");
            setPhoto({ raster: drawTestCard(), name: "a test card we drew" });
          }}
        >
          Draw a test card
        </button>{" "}
        {photo ? <span>Using {photo.name}.</span> : <span>No photo yet.</span>}
      </p>
      <p>
        <label>
          Layout{" "}
          <select value={layoutChoice} onChange={(event) => setLayoutChoice(event.target.value as LayoutChoice)}>
            <option value="test-card">Test card</option>
            <option value="whole-photo">Whole photo as one line</option>
            <option value="custom">Custom layout (JSON)</option>
          </select>
        </label>
      </p>
      {layoutChoice === "custom" && (
        <p>
          <label>
            Layout JSON
            <br />
            <textarea rows={10} cols={60} value={customLayout} onChange={(event) => setCustomLayout(event.target.value)} />
          </label>
        </p>
      )}
      <p>
        <label>
          <input type="checkbox" checked={wholePhoto} onChange={(event) => setWholePhoto(event.target.checked)} /> The photo is the card
          already (do not look for its edges)
        </label>
      </p>
      <p>
        <button type="button" className="sr-action" disabled={!photo || !manifest || reading} onClick={() => void read()}>
          Read
        </button>{" "}
        <span role="status">{status}</span>
      </p>
      {message && <p role="alert">{message}</p>}

      {outcome && (
        <>
          <h2>What was read</h2>
          <CropPicture raster={outcome.card} label="The straightened card" />
          <table>
            <caption>Fields read from the card</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Kind</th>
                <th scope="col">Value</th>
                <th scope="col">Confidence</th>
                <th scope="col">Crop</th>
              </tr>
            </thead>
            <tbody>
              {outcome.fields.map((field: FieldResult) => (
                <tr key={field.id}>
                  <th scope="row">{field.id}</th>
                  <td>{field.kind}</td>
                  <td>
                    {String(field.value ?? "not read")}
                    {field.note ? ` (${field.note})` : ""}
                  </td>
                  <td>
                    {Math.round(field.confidence * 100)}%{field.low ? " (low)" : ""}
                  </td>
                  <td>
                    <CropPicture raster={cropRaster(outcome.card, field.box)} label={`Crop of ${field.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
