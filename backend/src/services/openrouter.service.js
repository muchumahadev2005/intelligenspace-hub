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
export async function chatCompletion({ model, systemPrompt, messages, tools }) {
  const msgs = [
    { role: 'system', content: systemPrompt },
    ...(messages || []),
  ];

  // OpenRouter models must be in "provider/model" format (e.g. openai/gpt-4o-mini).
  // If the passed model is invalid or a dummy voice name (e.g. aurora-voice-mini), fallback to env.OPENROUTER_DEFAULT_MODEL.
  let selectedModel = model;
  if (!selectedModel || !selectedModel.includes('/')) {
    selectedModel = env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';
  }

  const params = {
    model: selectedModel,
    messages: msgs,
    temperature: 0.7,
    max_tokens: 1024,
  };

  if (tools && tools.length > 0) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }

  let response;
  try {
    response = await client.chat.completions.create(params);
  } catch (err) {
    // If the model failed (e.g. invalid model ID), retry with default model
    if (selectedModel !== (env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini')) {
      console.warn(`[OpenRouter] Model ${selectedModel} failed (${err.message}). Retrying with default model...`);
      params.model = env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';
      response = await client.chat.completions.create(params);
    } else {
      throw err;
    }
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
