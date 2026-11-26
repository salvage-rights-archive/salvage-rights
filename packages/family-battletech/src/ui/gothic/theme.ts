// The Gothic look is a body class. A Gothic page calls this while it is mounted; leaving the page (in the app, with no reload)
// takes the class off again, so Classic and the other games never see it. The colours are in gothic-theme.scss.
import { useEffect } from "react";
import "./gothic-theme.scss";

export const GOTHIC_CLASS = "bt-gothic";

// Two Gothic components can be mounted at once (a page and the panel inside it): the class stays until the last one leaves.
let users = 0;

export function useGothicTheme(on = true): void {
  useEffect(() => {
    if (!on) return;
    users += 1;
    document.body.classList.add(GOTHIC_CLASS);
    return () => {
      users -= 1;
      if (users === 0) document.body.classList.remove(GOTHIC_CLASS);
    };
  }, [on]);
}
