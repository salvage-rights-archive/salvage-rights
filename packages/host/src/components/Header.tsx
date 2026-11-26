import { Link, NavLink } from "react-router";

export function Header() {
  return (
    <header className="sr-header">
      {/* The name always leads back to the games, from any page. */}
      <Link className="sr-header__name" to="/" aria-label="Salvage Rights, back to Games">
        SALVAGE RIGHTS
      </Link>
      <nav aria-label="Site" className="sr-header__nav">
        <NavLink to="/" end>
          Games
        </NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
    </header>
  );
}
