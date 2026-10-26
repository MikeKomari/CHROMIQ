import { LoaderCircle } from "lucide-react";
import "../system-pages.css";

export default function WorkspaceLoading() {
  return (
    <main className="error-screen">
      <div className="error-card loading-card" role="status" aria-live="polite">
        <LoaderCircle className="spin" size={20} aria-hidden="true" />
        <span className="eyebrow">CHROMIQ workbench</span>
        <h1>Opening your workspace.</h1>
        <p>Loading your tokens and projects from this browser.</p>
      </div>
    </main>
  );
}
