import { ChevronRight } from "lucide-react";

/** Collapsible inspector section: a 36px header row (toggle + optional action) over the body. */
export function InspectorSection({
  id,
  title,
  open,
  onToggle,
  action,
  readOnly = false,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const bodyId = `inspector-section-${id}`;
  return (
    <section className="insp-section">
      <div className="insp-section-head">
        <button
          type="button"
          className="insp-section-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <ChevronRight size={14} className="insp-chevron" aria-hidden="true" />
          <span>{title}</span>
        </button>
        {action}
      </div>
      <div id={bodyId} className="insp-section-body" hidden={!open}>
        {open && (
          <fieldset className="insp-fieldset" disabled={readOnly}>
            {children}
          </fieldset>
        )}
      </div>
    </section>
  );
}
