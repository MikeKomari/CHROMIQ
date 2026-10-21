import { Check } from "lucide-react";
import type { Project } from "@/types/workspace";

export function ProjectsPanel({
  projects,
  projectId,
  projectName,
  loadProject,
  manage,
  readOnly,
}: {
  projects: Project[];
  projectId: string;
  projectName: string;
  loadProject: (project: Project) => void;
  manage: () => void;
  readOnly: boolean;
}) {
  const savedCurrent = projects.some((project) => project.id === projectId);
  return (
    <>
      <ul className="panel-list" aria-label="Projects">
        {!savedCurrent && (
          <li>
            <div className="panel-row current" aria-current="true">
              <span className="panel-row-swatch hollow" />
              <span className="panel-row-name">{projectName}</span>
              <span className="panel-row-meta">not saved</span>
              <Check size={14} className="panel-row-check" />
            </div>
          </li>
        )}
        {projects.map((project) => {
          const current = project.id === projectId;
          return (
            <li key={project.id}>
              <button
                type="button"
                className={`panel-row ${current ? "current" : ""}`}
                aria-current={current ? "true" : undefined}
                title={`Updated ${new Date(project.updatedAt).toLocaleDateString()}`}
                disabled={readOnly}
                onClick={() => loadProject(project)}
              >
                <span className="panel-row-swatch" style={{ background: project.tokens.accent }} />
                <span className="panel-row-name">{project.name}</span>
                {current && <Check size={14} className="panel-row-check" />}
              </button>
            </li>
          );
        })}
      </ul>
      {projects.length === 0 && (
        <p className="panel-empty">Save this system to add it to your projects.</p>
      )}
      <button type="button" className="panel-manage" onClick={manage}>
        Manage projects
      </button>
    </>
  );
}
