import { useState } from "react";
import { applyUpdate, usePwa } from "../pwa";

/**
 * The strip under the header that tells about the app itself: offline, ready for offline use, or a new version.
 * Each message sits in a polite live region that is always in the page, so a screen reader hears it appear.
 */
export function PwaBar() {
  const pwa = usePwa();
  const [applying, setApplying] = useState(false);

  const reload = () => {
    setApplying(true);
    void applyUpdate().then((result) => {
      if (result === "unsaved") setApplying(false);
    });
  };

  const messages = [
    !pwa.online && (
      <p key="offline" className="sr-pwa-bar__item">
        You are offline. Your saved 'Mechs and the tools work as usual. Importing from Mordel needs a connection.
      </p>
    ),
    pwa.offlineReady && (
      <p key="ready" className="sr-pwa-bar__item">
        Offline ready: the app is saved on this device and works without a connection.
      </p>
    ),
    pwa.updateReady && (
      <p key="update" className="sr-pwa-bar__item">
        {pwa.updateBlocked
          ? "A new version is ready. You have changes that are not saved: save them, then reload."
          : "A new version is ready."}{" "}
        <button type="button" className="sr-pwa-bar__button" disabled={applying} onClick={reload}>
          Reload
        </button>
      </p>
    ),
  ].filter(Boolean);

  return (
    <div className="sr-pwa-bar" aria-live="polite">
      {messages}
    </div>
  );
}
