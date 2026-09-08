import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { devApi } from "@/services/developer-api";

export default defineTool({
  name: "list_security_findings",
  title: "List security findings",
  description: "List security findings, optionally filtered by project id and severity.",
  inputSchema: {
    projectId: z.string().describe("Project id to list findings for, e.g. prj_ecom."),
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .optional()
      .describe("Filter to one severity level."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ projectId, severity }) => {
    const findings = await devApi.security.list(projectId);
    const rows = findings.filter((f) => !severity || f.severity === severity);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { findings: JSON.parse(JSON.stringify(rows)) },
    };
  },
});
