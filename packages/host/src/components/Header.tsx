import { NavLink } from "react-router";

export function Header() {
  return (
    <header className="sr-header">
      <span className="sr-header__name">SALVAGE RIGHTS</span>
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
