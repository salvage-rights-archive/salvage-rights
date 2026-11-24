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

export function About({ families }: { families: FamilyManifest[] }) {
  return (
    <main className="sr-page">
      <h1>About Salvage Rights</h1>
      <p>
        Salvage Rights is a fan project, not affiliated with or endorsed by the owners of the games it covers.
      </p>
      <p>These tools are built with AI assistance.</p>

      <h2>Credits</h2>
      {families.map((family) => (
        <section key={family.id} aria-label={`Credits: ${family.name}`} className="sr-credits">
          <h3>{family.name}</h3>
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

      <h2>Fonts</h2>
      <ul>
        {FONTS.map((font) => (
          <li key={font.name}>
            <a href={font.url}>{font.name}</a> by {font.by}, {font.license}.
          </li>
        ))}
      </ul>
    </main>
  );
}
