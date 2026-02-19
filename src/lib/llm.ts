/**
 * LLM integration — OpenAI function-calling loop with MCP tools.
 *
 * Phase 11 — Approach 3: LLM + MCP Client
 *
 * Flow:
 * 1. Discover tools from MCP server via listMcpTools()
 * 2. Convert MCP tool schemas → OpenAI function-calling format
 * 3. Send user message + tools to LLM
 * 4. If LLM returns tool_calls → execute via callMcpTool() → loop
 * 5. Return final text answer
 */

import OpenAI from "openai";
import { listMcpTools, callMcpTool, type McpToolDef } from "./mcp-client";

// ─── OpenAI client (lazy singleton) ────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "sk-your-key-here") {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set it in .env.local to enable AI mode."
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ─── Read-only tool filter ─────────────────────────────────────────────────

const WRITE_TOOLS = new Set([
  "create_assignment",
  "delete_assignment",
]);

function isReadOnlyTool(name: string): boolean {
  return !WRITE_TOOLS.has(name);
}

// ─── MCP → OpenAI schema conversion ───────────────────────────────────────

function mcpToolToOpenAI(
  tool: McpToolDef
): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  };
}

// ─── Cached tool list ──────────────────────────────────────────────────────

let cachedTools: OpenAI.Chat.Completions.ChatCompletionTool[] | null = null;

async function getToolDefinitions(): Promise<
  OpenAI.Chat.Completions.ChatCompletionTool[]
> {
  if (cachedTools) return cachedTools;

  const mcpTools = await listMcpTools();
  cachedTools = mcpTools
    .filter((t) => isReadOnlyTool(t.name))
    .map(mcpToolToOpenAI);

  console.log(
    `[llm] Loaded ${cachedTools.length} tools from MCP server (filtered ${mcpTools.length - cachedTools.length} write tools)`
  );

  return cachedTools;
}

// ─── System prompt builder ─────────────────────────────────────────────────

interface AskContext {
  rosterName?: string;
  rosterId: number;
  testName?: string;
  testId: number;
  compareTestName?: string;
  testId2?: number;
}

function buildSystemPrompt(ctx: AskContext): string {
  let prompt = `You are a helpful teaching assistant for an elementary school teacher.
You have access to tools that query a student performance dashboard with test scores,
intervention assignments, and Difference-in-Differences (DiD) impact analysis.

CURRENT CONTEXT (auto-injected — use these values by default):
- Roster ID: ${ctx.rosterId}${ctx.rosterName ? ` (${ctx.rosterName})` : ""}
- Primary Test ID: ${ctx.testId}${ctx.testName ? ` (${ctx.testName})` : ""}`;

  if (ctx.testId2) {
    prompt += `\n- Compare Test ID: ${ctx.testId2}${ctx.compareTestName ? ` (${ctx.compareTestName})` : ""}`;
  }

  prompt += `

DOMAIN KNOWLEDGE:
- Score range: 5100–5800 (scale scores, NOT percentages)
- Performance levels: Beginning (<5410), Approaching (5410–5469), Understands (5470–5529), Advanced (≥5530)
- Proficiency threshold: 5470 (Level 3+)
- Platforms: IXL, Khan Academy, Lexia Core5, Reflex

GUIDELINES:
- Always use the roster/test IDs from the context above unless the teacher specifies otherwise.
- For comparison queries (score drops/gains/level changes), use testId1 for the primary test and testId2 for comparison.
- Format responses with bullet points, bold names, and clear structure.
- Include performance level labels when showing scores.
- Limit results to top/bottom 10 by default unless asked otherwise.
- Never show raw JSON — always summarize in teacher-friendly natural language.
- Be concise but thorough. Teachers are busy.
- If you can't answer from the available tools, say so honestly.`;

  return prompt;
}

// ─── Main ask function ─────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

export async function askWithMcpTools(
  userMessage: string,
  context: AskContext
): Promise<string> {
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const tools = await getToolDefinitions();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(context) },
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 2000,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;

    // Add assistant message to conversation
    messages.push(assistantMsg);

    // If no tool calls, we're done — return the text
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return assistantMsg.content ?? "I wasn't able to generate a response.";
    }

    // Execute each tool call via MCP
    for (const toolCall of assistantMsg.tool_calls) {
      // OpenAI v6: tool_call can be function or custom type
      if (toolCall.type !== "function") continue;

      const { name } = toolCall.function;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      console.log(`[llm] Tool call: ${name}(${JSON.stringify(args)})`);

      let toolResult: string;
      try {
        // Safety check: block write tools
        if (!isReadOnlyTool(name)) {
          toolResult = `Error: Tool "${name}" is not allowed in Ask mode (read-only).`;
        } else {
          toolResult = await callMcpTool(name, args);
        }
      } catch (err) {
        toolResult = `Error calling tool "${name}": ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[llm] Tool error:`, err);
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }

  return "I reached the maximum number of tool calls. Please try a more specific question.";
}

/**
 * Check if the OpenAI API key is configured.
 */
export function isLlmConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-your-key-here";
}
