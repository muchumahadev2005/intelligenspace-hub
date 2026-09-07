import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { securityFindings } from "@/mock/developer";

export default defineTool({
  name: "list_security_findings",
  title: "List security findings",
  description: "List security findings, optionally filtered by project id and severity.",
  inputSchema: {
    projectId: z.string().optional().describe("Filter to one project id."),
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .optional()
      .describe("Filter to one severity level."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ projectId, severity }) => {
    const rows = securityFindings.filter(
      (f) => (!projectId || f.projectId === projectId) && (!severity || f.severity === severity),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { findings: JSON.parse(JSON.stringify(rows)) },
    };
  },
});
