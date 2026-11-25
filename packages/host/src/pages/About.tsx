import type { FamilyManifest } from "@salvage-rights/shared";

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
            <p>
              Owner: {family.credits.owner}. License: {family.credits.license}.
            </p>
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

      <p className="sr-edition">Edition: {editionId}</p>
    </div>
  );
}
