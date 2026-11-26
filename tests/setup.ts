// Shared test setup. The editor and sheet pages render a lot in happy-dom, and with builds running alongside, a dialog or an
// imported record can take longer than Testing Library's 1 s default to appear. The waits are raised here once, not per test.
import { configure } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });
