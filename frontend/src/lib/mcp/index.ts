import { defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import getProject from "./tools/get-project";
import listSecurityFindings from "./tools/list-security-findings";
import getCodeReview from "./tools/get-code-review";
import listAiTasks from "./tools/list-ai-tasks";

export default defineMcp({
  name: "ai-agent-console",
  title: "AI Agent Console",
  version: "0.1.0",
  instructions:
    "Read-only tools for the AI Agent Console developer workspace. Use `list_projects` to discover projects, then `get_project`, `get_code_review`, `list_security_findings` and `list_ai_tasks` for detail. All data is the app's built-in demo dataset.",
  tools: [listProjects, getProject, getCodeReview, listSecurityFindings, listAiTasks],
});
