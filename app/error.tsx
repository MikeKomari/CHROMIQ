"use client";

import { useEffect } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";
import { reportBoundaryError } from "@/lib/telemetry";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The boundary used to show this screen and drop the error on the floor, so
  // a user hitting it left no trace anywhere (CHROMIQ-1005). The digest is
  // what ties this report to the stack in the server log.
  useEffect(() => {
    reportBoundaryError("workspace-boundary", error);
  }, [error]);

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
