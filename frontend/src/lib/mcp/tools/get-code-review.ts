import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { devApi } from "@/services/developer-api";

export default defineTool({
  name: "get_code_review",
  title: "Get code review",
  description: "Get the latest AI code review, including findings, for one project.",
  inputSchema: { projectId: z.string().describe("Project id, e.g. prj_ecom.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ projectId }) => {
    try {
      const review = await devApi.review.get(projectId);
      if (!review) throw new ToolError(`No code review found for project "${projectId}".`);
      return {
        content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
        structuredContent: { review: JSON.parse(JSON.stringify(review)) },
      };
    } catch {
      throw new ToolError(`No code review found for project "${projectId}".`);
    }
  },
});
