import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { query } from '../../db/client.js';
import { chatCompletion } from '../../services/openrouter.service.js';
import { env } from '../../config/env.js';
import { extractJson } from '../../utils/format.js';

// Daily limit for Developer AI agent executions per workspace
export const DEVELOPER_AI_DAILY_LIMIT = 30;

export async function checkDeveloperLimit(workspaceId) {
  try {
    const res = await query(
      `SELECT COUNT(*) AS count FROM ai_tasks 
       WHERE workspace_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [workspaceId]
    );
    const runsToday = parseInt(res.rows[0]?.count || '0', 10);
    const remaining = Math.max(0, DEVELOPER_AI_DAILY_LIMIT - runsToday);
    const hasReachedLimit = runsToday >= DEVELOPER_AI_DAILY_LIMIT;
    return {
      runsToday,
      dailyLimit: DEVELOPER_AI_DAILY_LIMIT,
      remaining,
      hasReachedLimit,
    };
  } catch (err) {
    console.error('Failed to check developer limit:', err);
    return {
      runsToday: 0,
      dailyLimit: DEVELOPER_AI_DAILY_LIMIT,
      remaining: DEVELOPER_AI_DAILY_LIMIT,
      hasReachedLimit: false,
    };
  }
}

// Helper to save AI task and log activity
async function saveTask(workspaceId, projectId, agent, title, result, userName) {
  const task = await query(
    `INSERT INTO ai_tasks (workspace_id, project_id, title, agent, status, result, user_name)
     VALUES ($1,$2,$3,$4,'completed',$5,$6) RETURNING *`,
    [workspaceId, projectId, title, agent, JSON.stringify(result), userName]
  );
  await query(
    `INSERT INTO dev_activity (workspace_id, project_id, label, detail, agent)
     VALUES ($1,$2,$3,$4,$5)`,
    [workspaceId, projectId, `${agent} completed`, title, agent]
  );
  return task.rows[0];
}

// ── Code Review ─────────────────────────────────────────────────────
export const codeReviewRoutes = new Hono();
codeReviewRoutes.use('*', authMiddleware);

codeReviewRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const task = await query(
    `SELECT * FROM ai_tasks 
     WHERE workspace_id = $1 AND project_id = $2 AND agent = 'Code Review' 
     ORDER BY created_at DESC LIMIT 1`,
    [workspaceId, projectId]
  );
  if (task.rows.length === 0) {
    return c.json({ error: 'No review found' }, 404);
  }
  const row = task.rows[0];
  let resData = row.result;
  if (typeof resData === 'string') {
    try { resData = JSON.parse(resData); } catch {}
  }
  return c.json(resData);
});

codeReviewRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, code, language, filesCount, filePath, model } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const fileLabel = filePath || 'source code';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are an expert senior code reviewer. Analyze the provided single file (${fileLabel}) and return a JSON object with this exact structure:
{
  "findings": [
    {
      "title": "Short title describing the issue",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "Security" | "Performance" | "Code quality" | "Best practices",
      "file": "${filePath || 'file'}",
      "line": 15,
      "problem": "Clear explanation of the bug or flaw",
      "impact": "Why this matters or potential exploit/crash",
      "recommendation": "Concrete fix instructions",
      "diff": [
        { "type": "context", "text": "  function example() {" },
        { "type": "remove", "text": "-   problematicCode();" },
        { "type": "add", "text": "+   improvedSafeCode();" },
        { "type": "context", "text": "  }" }
      ]
    }
  ]
}
Return ONLY valid JSON. Provide between 1 and 4 specific, actionable findings for this file. If the file is completely clean and follows best practices, return {"findings": []}.`,
    messages: [{ role: 'user', content: `Review this file (${fileLabel}) written in ${language || 'code'}:\n\n${code}` }],
  });

  const parsed = extractJson(reply, { findings: [] });
  const rawFindings = parsed.findings || (Array.isArray(parsed) ? parsed : []);
  const validSeverities = ['critical', 'high', 'medium', 'low'];
  const validCategories = ['Security', 'Performance', 'Code quality', 'Best practices'];

  const findings = rawFindings.map((f, i) => {
    const sev = (f.severity || '').toLowerCase();
    const severity = validSeverities.includes(sev) ? sev : 'medium';
    const category = validCategories.includes(f.category) ? f.category : 'Code quality';
    const file = f.file && f.file !== 'source.ts' ? f.file : (filePath || 'source.ts');
    const line = typeof f.line === 'number' ? f.line : 1;
    const diff = Array.isArray(f.diff) && f.diff.length > 0 ? f.diff : [
      { type: 'context', text: `// In ${file} (line ${line})` },
      { type: 'remove', text: `- // Issue: ${f.problem || 'problematic pattern'}` },
      { type: 'add', text: `+ // Fix: ${f.recommendation || 'recommended fix'}` },
    ];

    return {
      id: `finding_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      title: f.title || 'Code Finding',
      severity,
      category,
      file,
      line,
      problem: f.problem || 'Potential issue detected in codebase.',
      impact: f.impact || 'Risk to code maintainability or stability.',
      recommendation: f.recommendation || 'Refactor according to best practices.',
      diff,
      status: 'open',
    };
  });

  const result = {
    id: `review_${Date.now()}`,
    projectId,
    type: 'Full review',
    filesReviewed: filesCount || 1,
    findings,
    createdAt: new Date().toISOString(),
  };

  await saveTask(workspaceId, projectId, 'Code Review', `Code review: ${fileLabel} (${findings.length} findings)`, result, userId);
  return c.json(result, 201);
});

// Helper to fetch latest task result for an agent
async function getLatestTaskResult(workspaceId, projectId, agent) {
  const task = await query(
    `SELECT * FROM ai_tasks 
     WHERE workspace_id = $1 AND project_id = $2 AND agent = $3 
     ORDER BY created_at DESC LIMIT 1`,
    [workspaceId, projectId, agent]
  );
  if (task.rows.length === 0) return null;
  const row = task.rows[0];
  let resData = row.result;
  if (typeof resData === 'string') {
    try { resData = JSON.parse(resData); } catch {}
  }
  return resData;
}

// ── Debugger ────────────────────────────────────────────────────────
export const debugRoutes = new Hono();
debugRoutes.use('*', authMiddleware);

debugRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Debugger');
  if (!result) return c.json({ error: 'No debug session found' }, 404);
  return c.json(result);
});

debugRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, errorMessage, stackTrace, code, model } = await c.req.json();
  if (!errorMessage) return c.json({ error: 'errorMessage is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are an expert debugger. Analyze the error and return JSON: { "rootCause": string, "reasoning": string[], "suggestedFix": string, "confidence": number, "patch": [{ "type": "add"|"remove"|"context", "text": string }] }. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `Error: ${errorMessage}\n\nStack: ${stackTrace || ''}\n\nCode:\n${code || ''}` }],
  });

  const debug = extractJson(reply, { rootCause: reply, reasoning: [], suggestedFix: '', confidence: 50, patch: [] });
  const result = {
    id: `dbg_${Date.now()}`,
    projectId,
    title: `Debugged: ${errorMessage.slice(0, 60)}`,
    errorMessage,
    ...debug,
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Debugger', `Debugged: ${errorMessage.slice(0, 60)}`, result, userId);
  return c.json(result, 201);
});

// ── Coding Agent ────────────────────────────────────────────────────
export const codingRoutes = new Hono();
codingRoutes.use('*', authMiddleware);

codingRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Coding Agent');
  if (!result) return c.json({ error: 'No coding task found' }, 404);
  return c.json(result);
});

codingRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, prompt, filePath, code, model } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const fileContext = filePath ? `Target File: ${filePath}\n` : '';
  const codeContext = code ? `Existing Code:\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\`\n` : '';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a senior full-stack software engineer. Implement the requested feature or fix with clean, modular code.
${filePath ? `You are modifying or creating this specific file: ${filePath}.` : ''}
Return JSON with this exact structure:
{
  "steps": [{ "id": "1", "label": "Step description", "status": "completed" }],
  "plan": [{ "id": "1", "label": "Plan item", "done": true }],
  "changes": [{ "path": "${filePath || 'src/index.ts'}", "change": "modified", "additions": 15, "deletions": 3 }],
  "diff": [
    { "type": "context", "text": "  // existing code context" },
    { "type": "remove", "text": "- // old code" },
    { "type": "add", "text": "+ // new code implemented" }
  ]
}
Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `${fileContext}${codeContext}\nUser Request: ${prompt}` }],
  });

  const coding = extractJson(reply, { steps: [], plan: [], changes: [], diff: [] });
  const result = {
    id: `code_${Date.now()}`,
    projectId,
    prompt,
    filePath: filePath || (coding.changes?.[0]?.path) || undefined,
    ...coding,
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Coding Agent', `${filePath ? `[${filePath}] ` : ''}${prompt.slice(0, 80)}`, result, userId);
  return c.json(result, 201);
});

// ── Architecture ────────────────────────────────────────────────────
export const architectureRoutes = new Hono();
architectureRoutes.use('*', authMiddleware);

architectureRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Architecture');
  if (!result) return c.json({ error: 'No architecture analysis found' }, 404);
  return c.json(result);
});

architectureRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, prompt, fileList, model } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const filesInfo = Array.isArray(fileList) && fileList.length > 0
    ? `\nProject File Tree:\n${fileList.slice(0, 100).join('\n')}`
    : '';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a principal software architect. Analyze the project and return JSON:
{
  "nodes": [{ "id": "api-gateway", "label": "API Gateway", "sublabel": "Express / Hono", "row": 0, "col": 0 }],
  "edges": [{ "from": "api-gateway", "to": "database" }],
  "stack": [{ "layer": "Backend", "choice": "Node.js", "reason": "High concurrency" }],
  "explanation": [{ "component": "API Gateway", "detail": "Routes requests and handles auth" }],
  "entities": [{ "name": "User", "fields": ["id", "email", "role"] }],
  "endpoints": [{ "method": "GET", "path": "/api/v1/resource", "purpose": "Fetch data" }],
  "scaling": ["Horizontal pod autoscaling", "Read replicas"],
  "security": ["Strict CORS", "JWT validation"],
  "tradeoffs": [{ "option": "Monolith vs Microservices", "detail": "Faster initial speed" }]
}
Return ONLY valid JSON. Provide realistic nodes with rows 0 to 2 and cols 0 to 3.`,
    messages: [{ role: 'user', content: `${prompt}${filesInfo}` }],
  });

  const arch = extractJson(reply, {});
  const result = {
    id: `arch_${Date.now()}`,
    projectId,
    prompt,
    nodes: arch.nodes || [
      { id: "frontend", label: "Web Client", sublabel: "React SPA", row: 0, col: 0 },
      { id: "api", label: "API Server", sublabel: "REST Backend", row: 1, col: 0 },
      { id: "db", label: "Database", sublabel: "PostgreSQL / Mongo", row: 2, col: 0 },
    ],
    edges: arch.edges || [{ from: "frontend", to: "api" }, { from: "api", to: "db" }],
    stack: arch.stack || [],
    explanation: arch.explanation || [],
    entities: arch.entities || [],
    endpoints: arch.endpoints || [],
    scaling: arch.scaling || [],
    security: arch.security || [],
    tradeoffs: arch.tradeoffs || [],
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Architecture', prompt.slice(0, 80), result, userId);
  return c.json(result, 201);
});

// ── Test Agent ──────────────────────────────────────────────────────
export const testRoutes = new Hono();
testRoutes.use('*', authMiddleware);

testRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Test Agent');
  if (!result) return c.json({ error: 'No test analysis found' }, 404);
  return c.json(result);
});

testRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, code, framework, filePath, model } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const fileLabel = filePath || 'source code';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are an expert test automation engineer. Generate unit tests for this specific single file: (${fileLabel}) using ${framework || 'vitest'}.
Return JSON with this exact structure:
{
  "framework": "${framework || 'vitest'}",
  "coverage": 88,
  "missing": [
    { "area": "Edge case / null inputs", "count": 2 },
    { "area": "Error handling branch", "count": 1 }
  ],
  "suggested": [
    { "id": "t1", "name": "should handle successful execution with valid payload", "area": "Happy path" },
    { "id": "t2", "name": "should throw or return 400 on invalid parameters", "area": "Validation" }
  ],
  "generatedDiff": [
    { "type": "context", "text": "import { describe, it, expect } from '${framework || 'vitest'}';" },
    { "type": "context", "text": "describe('${fileLabel}', () => {" },
    { "type": "add", "text": "+   it('should behave correctly under test', () => {" },
    { "type": "add", "text": "+     expect(true).toBe(true);" },
    { "type": "add", "text": "+   });" },
    { "type": "context", "text": "});" }
  ]
}
Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `Generate tests for file ${fileLabel}:\n\n${code.slice(0, 8000)}` }],
  });

  const tests = extractJson(reply, { framework: framework || 'vitest', coverage: 80, missing: [], suggested: [], generatedDiff: [] });
  const result = {
    id: `test_${Date.now()}`,
    projectId,
    filePath: fileLabel,
    framework: tests.framework || framework || 'vitest',
    coverage: typeof tests.coverage === 'number' ? tests.coverage : 85,
    missing: tests.missing || [],
    suggested: tests.suggested || [],
    generatedDiff: tests.generatedDiff || [],
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Test Agent', `Unit tests for ${fileLabel} (${result.coverage}% coverage)`, result, userId);
  return c.json(result, 201);
});

// ── Security ────────────────────────────────────────────────────────
export const securityRoutes = new Hono();
securityRoutes.use('*', authMiddleware);

securityRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Security');
  if (!result) return c.json({ error: 'No security findings found' }, 404);
  const findings = Array.isArray(result) ? result : (result.findings || []);
  return c.json(findings);
});

securityRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, code, filePath, model } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const fileLabel = filePath || 'source code';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are an elite application security engineer. Perform a deep security audit on this single file: (${fileLabel}).
Check for:
1. Broken authentication/authorization, insecure direct object references
2. Hardcoded secrets, API tokens, passwords
3. SQL/NoSQL injection, XSS, SSRF, command injection
4. Unhandled error leaks, unsafe regex (ReDoS), missing rate limiting
5. Insecure cryptography or hashing algorithms

Return JSON array of findings:
[
  {
    "title": "Clear vulnerability title",
    "severity": "critical" | "high" | "medium" | "low",
    "category": "Authentication" | "Authorization" | "Injection" | "Secrets" | "Configuration" | "Data Exposure",
    "file": "${fileLabel}",
    "line": 12,
    "description": "Exact vulnerability mechanism in this file",
    "impact": "Exploit scenario and potential damage",
    "recommendation": "Concrete remediation steps",
    "diff": [
      { "type": "context", "text": "  // vulnerable line context" },
      { "type": "remove", "text": "- // insecure code" },
      { "type": "add", "text": "+ // safe secure code" }
    ]
  }
]
If the file has zero vulnerabilities, return [].
Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `Security audit for file ${fileLabel}:\n\n${code.slice(0, 8000)}` }],
  });

  const parsed = extractJson(reply, []);
  const rawFindings = Array.isArray(parsed) ? parsed : (parsed.findings || []);
  const findings = rawFindings.map((f, i) => ({
    id: `sec_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    title: f.title || 'Security finding',
    severity: ['critical', 'high', 'medium', 'low'].includes(f.severity?.toLowerCase()) ? f.severity.toLowerCase() : 'medium',
    category: f.category || 'Security',
    file: f.file || fileLabel,
    line: typeof f.line === 'number' ? f.line : 1,
    description: f.description || 'Potential security issue identified in file.',
    impact: f.impact || 'Risk of unauthorized access or integrity compromise.',
    recommendation: f.recommendation || 'Apply secure coding standards and patch vulnerability.',
    diff: Array.isArray(f.diff) && f.diff.length > 0 ? f.diff : [
      { type: 'context', text: `// In ${fileLabel} (line ${f.line || 1})` },
      { type: 'remove', text: `- // Vulnerability: ${f.title || 'Insecure code'}` },
      { type: 'add', text: `+ // Fix: ${f.recommendation || 'Remediated code'}` },
    ],
    status: 'open',
  }));

  // Fetch previous findings to merge without losing historical scans
  const prevResult = await getLatestTaskResult(workspaceId, projectId, 'Security');
  const prevFindings = Array.isArray(prevResult) ? prevResult : (prevResult?.findings || []);
  // Replace findings for this file, keep other files
  const filteredPrev = prevFindings.filter((p) => p.file !== fileLabel);
  const combinedFindings = [...findings, ...filteredPrev];

  const result = { projectId, findings: combinedFindings, createdAt: new Date().toISOString() };
  await saveTask(workspaceId, projectId, 'Security', `Security audit: ${fileLabel} (${findings.length} findings)`, result, userId);
  return c.json(combinedFindings, 201);
});

// ── Documentation ────────────────────────────────────────────────────
export const documentationRoutes = new Hono();
documentationRoutes.use('*', authMiddleware);

documentationRoutes.get('/:projectId', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.param('projectId');
  const result = await getLatestTaskResult(workspaceId, projectId, 'Documentation');
  if (!result) return c.json({ error: 'No documentation found' }, 404);
  const docs = Array.isArray(result) ? result : (result.docs || [result]);
  return c.json(docs);
});

documentationRoutes.post('/', async (c) => {
  const { workspaceId, userId } = c.get('user');
  const { projectId, code, kind, filePath, model } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const quota = await checkDeveloperLimit(workspaceId);
  if (quota.hasReachedLimit) {
    return c.json({
      error: `Daily Developer AI limit reached (${DEVELOPER_AI_DAILY_LIMIT} runs/24h). Please try again tomorrow.`,
      code: 'QUOTA_EXCEEDED',
      runsToday: quota.runsToday,
      dailyLimit: quota.dailyLimit,
      remaining: 0,
    }, 429);
  }

  const docKind = kind || 'README';
  const fileLabel = filePath ? `for ${filePath}` : '';

  const { reply } = await chatCompletion({
    model: model || env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a technical documentation specialist. Write comprehensive, professional ${docKind} markdown documentation ${fileLabel}.
Include clear headings, code examples, API contracts, parameters, and return types where applicable. Return only valid markdown content.`,
    messages: [{ role: 'user', content: `Generate ${docKind} ${fileLabel}:\n\n${code.slice(0, 8000)}` }],
  });

  const newDoc = {
    id: `doc_${Date.now()}`,
    projectId,
    kind: docKind,
    filePath: filePath || undefined,
    content: reply,
    updatedAt: new Date().toISOString(),
  };

  const prevResult = await getLatestTaskResult(workspaceId, projectId, 'Documentation');
  let docsList = [];
  if (Array.isArray(prevResult)) {
    docsList = [newDoc, ...prevResult.filter((d) => d.kind !== docKind || (filePath && d.filePath !== filePath))];
  } else if (prevResult && typeof prevResult === 'object') {
    docsList = [newDoc, ...(prevResult.docs || [prevResult]).filter((d) => d.kind !== docKind || (filePath && d.filePath !== filePath))];
  } else {
    docsList = [newDoc];
  }

  await saveTask(workspaceId, projectId, 'Documentation', `Generated ${docKind} ${fileLabel}`.trim(), docsList, userId);
  return c.json(newDoc, 201);
});
