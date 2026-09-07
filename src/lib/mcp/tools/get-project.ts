import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { projects } from "@/mock/developer";

export default defineTool({
  name: "get_project",
  title: "Get project",
  description: "Get full details for one developer project, including stack and repository structure.",
  inputSchema: { projectId: z.string().describe("Project id, e.g. prj_ecom.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ projectId }) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new ToolError(`No project found with id "${projectId}".`);
    const { files: _files, ...rest } = project;
    return {
      content: [{ type: "text", text: JSON.stringify(rest, null, 2) }],
      structuredContent: { project: JSON.parse(JSON.stringify(rest)) },
    };
  },
});
