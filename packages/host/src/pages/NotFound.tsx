import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="sr-page">
      <h1>Nothing here</h1>
      <p>
        <Link to="/">Back to the landing page</Link>
      </p>
    </div>
  );
}
