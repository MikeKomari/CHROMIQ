import { useState } from "react";
import { Cloud, CloudUpload, FolderOpen, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Project } from "@/types/workspace";
import type { SyncedProject } from "@/lib/sync";

export function ProjectModal({
  projectName,
  projects,
  renameProject,
  createProject,
  loadProject,
  deleteProject,
  saveProject,
  cloud,
  close,
}: {
  projectName: string;
  projects: Project[];
  renameProject: (name: string) => void;
  createProject: (name: string) => void;
  loadProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  saveProject: (name?: string) => void;
  /** Absent when accounts are off on this deployment, or nobody is signed in. */
  cloud?: {
    projects: SyncedProject[];
    loading: boolean;
    linked: boolean;
    open: (project: SyncedProject) => void;
    remove: (project: SyncedProject) => Promise<boolean>;
    link: () => void;
  };
  close: () => void;
}) {
  const [draft, setDraft] = useState(projectName);
  // Commit a trimmed, non-empty name; a blank field snaps back to the current name.
  const commitName = () => {
    const name = draft.trim();
    if (!name) {
      setDraft(projectName);
      return;
    }
    setDraft(name);
    renameProject(name);
    saveProject(name);
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="project-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Project library</span>
            <h2>Keep your systems close.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close projects"
          >
            <X size={17} />
          </button>
        </div>
        <div className="project-current">
          <label>
            Current project
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          <button
            className="primary-button"
            onClick={() => {
              saveProject(draft.trim() || projectName);
              close();
            }}
          >
            <FolderOpen size={15} /> Save project
          </button>
        </div>
        <div className="project-list">
          {projects.length ? (
            projects.map((project) => (
              <div className="project-item" key={project.id}>
                <button
                  onClick={() => {
                    loadProject(project);
                    close();
                  }}
                >
                  <span className="project-item-mark" />
                  <span>
                    <strong>{project.name}</strong>
                    <small>
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </small>
                  </span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => deleteProject(project.id)}
                  aria-label={`Delete ${project.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No saved projects yet. Save this system to create the first one.
            </div>
          )}
        </div>
        <button
          className="secondary-button"
          onClick={() => {
            const name = window.prompt("Name this project", "New system")?.trim();
            if (name) createProject(name);
          }}
        >
          <Plus size={15} /> New project
        </button>
        {cloud && (
          <section className="project-cloud" aria-labelledby="project-cloud-heading">
            <div className="project-cloud-head">
              <h3 id="project-cloud-heading">
                <Cloud size={14} /> In your account
              </h3>
              {!cloud.linked && (
                <button type="button" className="mini-text-button" onClick={cloud.link}>
                  <CloudUpload size={14} /> Sync this one
                </button>
              )}
            </div>
            <p className="project-cloud-note">
              These open in any browser you sign in to. Projects above this line
              are saved in this browser only.
            </p>
            {cloud.loading ? (
              <p className="empty-state">
                <Loader2 size={14} className="spin" /> Loading your projects
              </p>
            ) : cloud.projects.length ? (
              <div className="project-list">
                {cloud.projects.map((project) => (
                  <div className="project-item" key={project.id}>
                    <button
                      onClick={() => {
                        cloud.open(project);
                        close();
                      }}
                    >
                      <span className="project-item-mark is-cloud" />
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          Synced {new Date(project.updated_at).toLocaleString()}
                        </small>
                      </span>
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => void cloud.remove(project)}
                      aria-label={`Remove ${project.name} from your account`}
                      title="Remove from your account. The copy in this browser stays."
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Nothing synced yet. Use &ldquo;Sync this one&rdquo; to put the
                current system in your account.
              </p>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
