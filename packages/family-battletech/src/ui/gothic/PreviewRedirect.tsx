// The Gothic pages first ran for a night under `gothic-preview/*`. A bookmark or a shared link to one lands here and goes to the same
// page under `gothic/*`, with the query (the id of the 'Mech, unit or force) and any anchor kept. No data changes.
import { Navigate, useLocation } from "react-router";
import { GOTHIC_BASE } from "../../data/rulesets";

/** The same page under the Gothic base; undefined for a path that is not a preview page. */
export function currentPath(pathname: string): string | undefined {
  const match = /\/gothic-preview\/([a-z0-9-]+)\/?$/.exec(pathname);
  return match?.[1] ? `${GOTHIC_BASE}/${match[1]}` : undefined;
}

export default function PreviewRedirect() {
  const { pathname, search, hash } = useLocation();
  const to = currentPath(pathname);
  return <Navigate to={`${to ?? `${GOTHIC_BASE}/home`}${search}${hash}`} replace />;
}
