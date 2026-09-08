import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { query } from '../../db/client.js';
import { chatCompletion } from '../../services/openrouter.service.js';
import { env } from '../../config/env.js';
import { extractJson } from '../../utils/format.js';

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
  const { projectId, code, language, filesCount } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are an expert senior code reviewer. Analyze the provided code and return a JSON object with this exact structure:
{
  "findings": [
    {
      "title": "Short title describing the issue",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "Security" | "Performance" | "Code quality" | "Best practices",
      "file": "path/to/file.ext",
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
Return ONLY valid JSON. Provide between 2 and 5 specific, high-value findings.`,
    messages: [{ role: 'user', content: `Review this ${language || 'code'} codebase:\n\n${code}` }],
  });

  const parsed = extractJson(reply, { findings: [] });
  const rawFindings = parsed.findings || (Array.isArray(parsed) ? parsed : []);
  const validSeverities = ['critical', 'high', 'medium', 'low'];
  const validCategories = ['Security', 'Performance', 'Code quality', 'Best practices'];

  const findings = rawFindings.map((f, i) => {
    const sev = (f.severity || '').toLowerCase();
    const severity = validSeverities.includes(sev) ? sev : 'medium';
    const category = validCategories.includes(f.category) ? f.category : 'Code quality';
    const file = f.file || 'source.ts';
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

  await saveTask(workspaceId, projectId, 'Code Review', `Code review — ${findings.length} findings`, result, userId);
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
  const { projectId, errorMessage, stackTrace, code } = await c.req.json();
  if (!errorMessage) return c.json({ error: 'errorMessage is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
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
  const { projectId, prompt } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a senior software engineer. For the given task, return JSON: { "steps": [{ "id": string, "label": string, "status": "completed" }], "plan": [{ "id": string, "label": string, "done": true }], "changes": [{ "path": string, "change": "added"|"modified"|"deleted", "additions": number, "deletions": number }], "diff": [{ "type": "add"|"remove"|"context", "text": string }] }. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const coding = extractJson(reply, { steps: [], plan: [], changes: [], diff: [] });
  const result = {
    id: `code_${Date.now()}`,
    projectId,
    prompt,
    ...coding,
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Coding Agent', prompt.slice(0, 80), result, userId);
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
  const { projectId, prompt } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a software architect. Return JSON: { "nodes": [{ "id": string, "label": string, "sublabel": string, "row": number, "col": number }], "edges": [{ "from": string, "to": string }], "stack": [{ "layer": string, "choice": string, "reason": string }], "explanation": [{ "component": string, "detail": string }], "entities": [{ "name": string, "fields": string[] }], "endpoints": [{ "method": string, "path": string, "purpose": string }], "scaling": string[], "security": string[], "tradeoffs": [{ "option": string, "detail": string }] }. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const arch = extractJson(reply, {});
  const result = {
    id: `arch_${Date.now()}`,
    projectId,
    prompt,
    nodes: arch.nodes || [],
    edges: arch.edges || [],
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
  const { projectId, code, framework } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a test engineer. Analyze code and return JSON: { "framework": string, "coverage": number, "missing": [{ "area": string, "count": number }], "suggested": [{ "id": string, "name": string, "area": string }], "generatedDiff": [{ "type": "add"|"remove"|"context", "text": string }] }. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `Generate tests for this ${framework || ''} code:\n\n${code}` }],
  });

  const tests = extractJson(reply, { framework: framework || 'vitest', coverage: 0, missing: [], suggested: [], generatedDiff: [] });
  const result = {
    id: `test_${Date.now()}`,
    projectId,
    framework: tests.framework || 'vitest',
    coverage: typeof tests.coverage === 'number' ? tests.coverage : 75,
    missing: tests.missing || [],
    suggested: tests.suggested || [],
    generatedDiff: tests.generatedDiff || [],
    createdAt: new Date().toISOString(),
  };
  await saveTask(workspaceId, projectId, 'Test Agent', `Test analysis — ${result.coverage}% coverage`, result, userId);
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
  const { projectId, code } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a security expert. Scan the code and return JSON array of findings: [{ "title": string, "severity": "critical"|"high"|"medium"|"low", "category": "Authentication"|"Authorization"|"Dependencies"|"Secrets"|"API"|"Database"|"Configuration", "file": string, "line": number, "description": string, "impact": string, "recommendation": string, "diff": [{ "type": "add"|"remove"|"context", "text": string }] }]. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: `Security scan:\n\n${code}` }],
  });

  const parsed = extractJson(reply, []);
  const rawFindings = Array.isArray(parsed) ? parsed : (parsed.findings || []);
  const findings = rawFindings.map((f, i) => ({
    id: `sec_${Date.now()}_${i}`,
    projectId,
    title: f.title || 'Security issue',
    severity: ['critical', 'high', 'medium', 'low'].includes(f.severity?.toLowerCase()) ? f.severity.toLowerCase() : 'medium',
    category: f.category || 'Security',
    file: f.file || 'source.ts',
    line: typeof f.line === 'number' ? f.line : 1,
    description: f.description || 'Vulnerability detected in codebase.',
    impact: f.impact || 'High risk of unauthorized access or exposure.',
    recommendation: f.recommendation || 'Remediate immediately according to security best practices.',
    diff: Array.isArray(f.diff) && f.diff.length > 0 ? f.diff : [
      { type: 'context', text: `// In ${f.file || 'source'} (line ${f.line || 1})` },
      { type: 'remove', text: `- // Vulnerability: ${f.title || 'insecure pattern'}` },
      { type: 'add', text: `+ // Fix: ${f.recommendation || 'secure pattern'}` },
    ],
    status: 'open',
  }));

  const result = { projectId, findings, createdAt: new Date().toISOString() };
  await saveTask(workspaceId, projectId, 'Security', `Security scan — ${findings.length} issues found`, result, userId);
  return c.json(findings, 201);
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
  const { projectId, code, kind } = await c.req.json();
  if (!code) return c.json({ error: 'code is required' }, 400);

  const docKind = kind || 'README';
  const { reply } = await chatCompletion({
    model: env.OPENROUTER_DEFAULT_MODEL,
    systemPrompt: `You are a technical writer. Generate a complete ${docKind} in markdown format for the provided code/project. Return only the markdown content.`,
    messages: [{ role: 'user', content: `Generate ${docKind} for:\n\n${code}` }],
  });

  const newDoc = {
    id: `doc_${Date.now()}`,
    projectId,
    kind: docKind,
    content: reply,
    updatedAt: new Date().toISOString(),
  };

  // Check if existing docs exist to append or replace
  const prevResult = await getLatestTaskResult(workspaceId, projectId, 'Documentation');
  let docsList = [];
  if (Array.isArray(prevResult)) {
    docsList = [newDoc, ...prevResult.filter((d) => d.kind !== docKind)];
  } else if (prevResult && typeof prevResult === 'object') {
    docsList = [newDoc, ...(prevResult.docs || [prevResult]).filter((d) => d.kind !== docKind)];
  } else {
    docsList = [newDoc];
  }

  await saveTask(workspaceId, projectId, 'Documentation', `Generated ${docKind}`, docsList, userId);
  return c.json(newDoc, 201);
});
