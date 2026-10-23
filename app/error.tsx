"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-screen">
      <div className="error-card">
        <TriangleAlert size={20} />
        <span className="eyebrow">CHROMIQ recovery</span>
        <h1>The workbench hit a rough edge.</h1>
        <p>
          Your local project is still safe. Try rendering this workspace again.
        </p>
        <button className="primary-button" onClick={reset}>
          <RefreshCcw size={15} /> Try again
        </button>
      </div>
    </main>
  );
}
