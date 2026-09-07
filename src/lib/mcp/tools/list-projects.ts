import { defineTool } from "@lovable.dev/mcp-js";
import { projects } from "@/mock/developer";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List the developer projects in the workspace with their health scores.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      repository: p.repository.fullName,
      branch: p.repository.branch,
      language: p.language,
      framework: p.framework,
      codeQuality: p.codeQuality,
      security: p.security,
      coverage: p.coverage,
      architectureRating: p.architectureRating,
      findingsSummary: p.findingsSummary,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { projects: JSON.parse(JSON.stringify(rows)) },
    };
  },
});
