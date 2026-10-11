import { FolderOpen, Plus, Trash2, X } from "lucide-react";
import type { Project } from "@/types/workspace";

export function ProjectModal({
  projectName,
  projects,
  renameProject,
  createProject,
  loadProject,
  deleteProject,
  saveProject,
  close,
}: {
  projectName: string;
  projects: Project[];
  renameProject: (name: string) => void;
  createProject: (name: string) => void;
  loadProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  saveProject: () => void;
  close: () => void;
}) {
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
              value={projectName}
              onChange={(event) => renameProject(event.target.value)}
              onBlur={saveProject}
            />
          </label>
          <button
            className="primary-button"
            onClick={() => {
              saveProject();
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
            const name = window.prompt("Name this project", "New system");
            if (name) createProject(name);
          }}
        >
          <Plus size={15} /> New project
        </button>
      </section>
    </div>
  );
}
