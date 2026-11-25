import { useEffect, useState } from "react";
import type { FamilyManifest } from "@salvage-rights/shared";
import { resetAppCache, workerVersion } from "../pwa";

const FONTS = [
  {
    name: "Stardos Stencil Bold",
    by: "Vernon Adams",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Stardos+Stencil",
  },
  {
    name: "Special Elite",
    by: "Astigmatic",
    license: "Apache License 2.0",
    url: "https://fonts.google.com/specimen/Special+Elite",
  },
];

const SOURCE_URL = "https://github.com/salvage-rights-archive/salvage-rights";
/** The same name as NOTICES_FILE in vite/families-plugin.ts, which writes the file. */
const NOTICES_FILE = "third-party-notices.txt";

/** The app's offline copy: which version is saved, and the way out if it ever misbehaves. */
function AppCache() {
  // undefined while asking; null when there is no worker (or the browser has none).
  const [version, setVersion] = useState<string | null | undefined>(() =>
    "serviceWorker" in navigator ? undefined : null,
  );
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let current = true;
    void workerVersion().then((found) => {
      if (current) setVersion(found);
    });
    return () => {
      current = false;
    };
  }, []);
  return (
    <section aria-labelledby="cache-heading">
      <h2 id="cache-heading">Offline copy</h2>
      <p>
        This site keeps a copy of itself on your device so it opens without a connection.{" "}
        {version === undefined ? "" : version === null ? "No offline copy is installed in this browser." : `Offline copy version: ${version}.`}
      </p>
      <p>
        If the app looks broken or stuck on an old version, reset it. This removes only the saved copy of the app and
        reloads the page. Your saved 'Mechs and settings are kept.
      </p>
      <p>
        <button
          type="button"
          className="sr-settings__button"
          onClick={() => {
            void resetAppCache();
          }}
        >
          Reset the app cache
        </button>
      </p>
    </section>
  );
}

export function About({ families, editionId }: { families: FamilyManifest[]; editionId: string }) {
  const gplFamilies = families.filter((family) => family.credits.license.startsWith("GPL"));
  return (
    <div className="sr-page">
      <h1>About Salvage Rights</h1>
      <p>
        Salvage Rights is a fan project, not affiliated with or endorsed by the owners of the games it covers.
      </p>
      <p>These tools are built with AI assistance.</p>

      <section id="credits" aria-labelledby="credits-heading">
        <h2 id="credits-heading">Credits</h2>
        {families.map((family) => (
          <section key={family.id} aria-labelledby={`credits-${family.id}`} className="sr-credits">
            <h3 id={`credits-${family.id}`}>{family.name}</h3>
            <p>{family.credits.owner}</p>
            <p>License of this section's code: {family.credits.license}.</p>
            {family.credits.notes.length > 0 && (
              <ul>
                {family.credits.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </section>

      <h2>Fonts</h2>
      <ul>
        {FONTS.map((font) => (
          <li key={font.name}>
            <a href={font.url}>{font.name}</a> by {font.by}, {font.license}.
          </li>
        ))}
      </ul>

      <section aria-labelledby="source-heading">
        <h2 id="source-heading">Source code and licenses</h2>
        <p>
          The complete source code of this site is public: <a href={SOURCE_URL}>{SOURCE_URL}</a>. Each part carries its
          own license there.
        </p>
        {gplFamilies.length > 0 && (
          <p>
            This build includes {gplFamilies.map((family) => family.name).join(", ")}, so the build as a whole is free
            software under the <a href="https://www.gnu.org/licenses/gpl-3.0.html">GNU General Public License</a>,
            version 3 or later. You may use, study, share and change it under that license. It comes with no warranty.
          </p>
        )}
        <p>
          {/* Written by the build (see the families plugin); the dev server has no such file. */}
          <a href={`${import.meta.env.BASE_URL}${NOTICES_FILE}`}>Third-party notices</a>: the software and fonts made
          by others that this build contains, with their licenses.
        </p>
      </section>

      <AppCache />

      <p className="sr-edition">Edition: {editionId}</p>
    </div>
  );
}
