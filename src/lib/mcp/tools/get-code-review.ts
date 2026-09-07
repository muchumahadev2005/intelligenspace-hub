import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { codeReviews } from "@/mock/developer";

export default defineTool({
  name: "get_code_review",
  title: "Get code review",
  description: "Get the latest AI code review, including findings, for one project.",
  inputSchema: { projectId: z.string().describe("Project id, e.g. prj_ecom.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ projectId }) => {
    const review = codeReviews.find((r) => r.projectId === projectId);
    if (!review) throw new ToolError(`No code review found for project "${projectId}".`);
    return {
      content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
      structuredContent: { review },
    };
  },
});
