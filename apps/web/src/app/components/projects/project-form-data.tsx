"use client";

import { Project } from "../../../lib/api";
import { FormDataWorkspace } from "../../form-data-workspace";

export function ProjectFormData({ project, onProjectUpdated }: { project: Project; onProjectUpdated: () => Promise<void> }) {
  return <section className="workspace-form-tab"><FormDataWorkspace project={project} onClose={() => undefined} onProjectUpdated={onProjectUpdated} embedded /></section>;
}
