import OpenAI from 'openai';
import { env } from '../config/env.js';

const client = new OpenAI({
  apiKey: env.OPEN_ROUTER_KEY,
  baseURL: env.OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://intelligenspace.io',
    'X-Title': 'IntelliGenSpace Hub',
  },
});

/**
 * Send a chat completion request via OpenRouter.
 * @param {object} options
 * @param {string} options.model - OpenRouter model string e.g. "openai/gpt-4o-mini"
 * @param {string} options.systemPrompt - The agent's instructions / system prompt
 * @param {Array}  options.messages - Conversation history [{role, content}]
 * @param {Array}  [options.tools] - OpenAI function/tool definitions
 * @returns {object} { reply, usage, toolCalls }
 */
export async function chatCompletion({ model, systemPrompt, messages, tools, maxTokens }) {
  const msgs = [
    { role: 'system', content: systemPrompt },
    ...(messages || []),
  ];

  // OpenRouter models must be in "provider/model" format (e.g. openrouter/free).
  // If the passed model is invalid or a dummy voice name (e.g. aurora-voice-mini), fallback to env.OPENROUTER_DEFAULT_MODEL.
  let selectedModel = model;
  if (!selectedModel || !selectedModel.includes('/')) {
    selectedModel = env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free';
  }

  const params = {
    model: selectedModel,
    messages: msgs,
    temperature: 0.7,
    max_tokens: maxTokens || 3072,
  };

  if (tools && tools.length > 0) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }

  const freeModels = [
    selectedModel,
    env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3.5-lightning:free',
    'liquid/lfm-2.5-2.6b:free',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let response;
  let lastErr;

  for (const candidate of freeModels) {
    try {
      params.model = candidate;
      response = await client.chat.completions.create(params);
      if (candidate !== selectedModel) {
        console.log(`[OpenRouter] Successfully completed using free fallback model: ${candidate}`);
      }
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`[OpenRouter] Model ${candidate} failed (${err.message}). Trying next free model...`);
    }
  }

  if (!response) {
    throw lastErr || new Error('All free OpenRouter models failed to respond.');
  }

  const choice = response.choices[0];

  return {
    reply: choice.message.content || '',
    toolCalls: choice.message.tool_calls || [],
    usage: response.usage,
    finishReason: choice.finish_reason,
  };
}

/**
 * Build the system prompt for an agent from its DB config.
 */
export function buildAgentSystemPrompt(agent, workspaceName = '') {
  const toolInstructions = (agent.tools || []).map((t) => {
    if (t === 'appointments' || t === 'Book appointment') return '- You can book, reschedule and cancel appointments. Ask for customer name, preferred date and time.';
    if (t === 'orders' || t === 'Look up order') return '- You can take and manage orders. Ask for items, quantities, and delivery details.';
    if (t === 'catalog') return '- You can check product availability, prices and descriptions from the catalog.';
    return `- You have access to the ${t} capability.`;
  }).join('\n');

  return `You are ${agent.name}, an AI ${agent.type} agent for ${workspaceName}.

Personality: ${agent.personality || 'helpful and professional'}
Tone: ${agent.tone || 'professional'}
Language: ${agent.language || 'English'}

Your instructions:
${agent.instructions || 'Help customers with their queries professionally.'}

${toolInstructions ? `\nCapabilities:\n${toolInstructions}` : ''}

Always be concise, helpful and stay in character. Do not reveal that you are an AI unless directly asked.`;
}
