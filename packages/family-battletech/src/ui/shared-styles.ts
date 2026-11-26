// The stylesheets several of the family's games share, loaded once here and imported by index.ts, which the host loads in its entry
// before any page. Their CSS therefore always comes first in the document, and every page's own sheet (aces.scss, aero.scss,
// gothic-theme.scss, tracker.scss, ...) comes after them, whatever chunks the build makes. A page must not import these itself:
// where its chunk landed in the build used to decide which of two equal rules won.
import "./classic.scss";
import "./as/alpha-strike.scss";
