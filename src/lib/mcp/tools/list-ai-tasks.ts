import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { aiTasks } from "@/mock/developer";

export default defineTool({
  name: "list_ai_tasks",
  title: "List AI tasks",
  description: "List the AI agent task history, optionally filtered by project id or status.",
  inputSchema: {
    projectId: z.string().optional().describe("Filter to one project id."),
    status: z.string().optional().describe("Filter by task status, e.g. completed, running, failed."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ projectId, status }) => {
    const rows = aiTasks.filter(
      (t) => (!projectId || t.projectId === projectId) && (!status || t.status === status),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { tasks: rows },
    };
  },
});
