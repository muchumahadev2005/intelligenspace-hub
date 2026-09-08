import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { devApi } from "@/services/developer-api";

export default defineTool({
  name: "list_ai_tasks",
  title: "List AI tasks",
  description: "List the AI agent task history, optionally filtered by project id or status.",
  inputSchema: {
    projectId: z.string().optional().describe("Filter to one project id."),
    status: z.string().optional().describe("Filter by task status, e.g. completed, running, failed."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ projectId, status }) => {
    const tasks = await devApi.tasks.list(projectId);
    const rows = tasks.filter((t) => !status || t.status === status);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { tasks: JSON.parse(JSON.stringify(rows)) },
    };
  },
});
