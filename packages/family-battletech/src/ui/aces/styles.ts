// The Aces pages' styles in the one order that matters: the Classic buttons and fields, then Alpha Strike's card, then Aces' own, whose
// rules must come last because several share a specificity with the earlier ones. Every Aces page imports this and not the three files.
import "../classic.scss";
import "../as/alpha-strike.scss";
import "./aces.scss";
