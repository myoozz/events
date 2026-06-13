import { renderToString } from "react-dom/server";
import LandingPage from "./components/LandingPage";

/* Build-time prerender entry for "/" — used only by scripts/prerender.mjs.
   LandingPage is prerender-safe by design: all copy in static DOM, hidden
   states gated behind the .js class added on mount, browser APIs in effects. */
export function render() {
  return renderToString(<LandingPage />);
}
