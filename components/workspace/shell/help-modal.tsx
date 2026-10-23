import { X } from "lucide-react";

const shortcuts = [
  { keys: "Ctrl K / ⌘ K", action: "Search actions" },
  { keys: "V", action: "Toggle the Select tool on the canvas" },
  { keys: "Esc", action: "Close the open dialog or token popover, then leave the Select tool" },
  { keys: "Arrow keys", action: "Move between the rail icons, the device buttons, and color picker handles" },
];

const tips = [
  "Pick a starter or edit tokens in the inspector. The preview updates as you change them.",
  "Turn on the Select tool, click an element in the preview, and edit the tokens it uses.",
  "Save a snapshot before a big change, then restore it from the Snapshots panel.",
  "Export CSS, Tailwind, shadcn/ui, DTCG tokens, or DESIGN.md from the Export button.",
];

export function HelpModal({ close }: { close: () => void }) {
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="project-modal help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Help</span>
            <h2 id="help-title">Shortcuts and tips</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close help" autoFocus>
            <X size={17} />
          </button>
        </div>
        <h3 className="help-heading">Keyboard shortcuts</h3>
        <dl className="help-shortcuts">
          {shortcuts.map((item) => (
            <div key={item.keys}>
              <dt>
                <kbd>{item.keys}</kbd>
              </dt>
              <dd>{item.action}</dd>
            </div>
          ))}
        </dl>
        <h3 className="help-heading">Working in CHROMIQ</h3>
        <ul className="help-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
