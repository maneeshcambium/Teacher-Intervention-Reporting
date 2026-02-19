# Phase 11 Prompt: Natural Language Ask — LLM-Powered Teacher Q&A

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–10 complete.
> **Stack**: Next.js 14 App Router, TypeScript, OpenAI/Anthropic SDK, `@modelcontextprotocol/sdk`, better-sqlite3, shadcn/ui, TanStack Query.

---

## Problem

Phase 10 added a **Smart Query Panel** with 9 pre-canned query cards and an **MCP Server** with 19 tools. Both work, but they have fundamental limitations:

- **Pre-canned queries** only answer exactly those 9 questions. If a teacher wants to ask *"Show me Level 1 students in Mrs. Jones' class who haven't started any assignments and scored below 5300"*, they can't.
- **MCP Server** exposes rich tools, but only works through external MCP clients (Claude Desktop, VS Code Copilot). Teachers shouldn't need to leave the dashboard to ask questions.

**This phase replaces the pre-canned query cards with a free-form text input**, powered by an LLM that uses the dashboard's own data functions (Approach 2) or MCP tools (Approach 3) to answer any question a teacher might ask.

---

## Approach Comparison

### Approach 2: LLM + Direct Function Calls (Recommended)

The LLM calls the existing `lib/queries.ts` and `lib/impact.ts` functions directly via OpenAI/Anthropic **function-calling** (tool-use). No MCP transport involved — the API route imports the functions, describes them to the LLM as tools, executes whichever the LLM picks, and returns the result.

```
Teacher types: "Who's struggling the most without any help?"
        ↓
  POST /api/ask  { message: "...", rosterId, testId, testId2? }
        ↓
  API route builds messages:
    - System prompt (schema context, tool definitions, current roster/test)
    - User message
        ↓
  Call LLM (OpenAI / Anthropic) with function-calling tools
        ↓
  LLM returns tool_call: e.g. queryStudentsNatural("unassigned_struggling", ...)
        ↓
  API route executes the function in-process (import from lib/)
        ↓
  Send tool result back to LLM for natural language summarization
        ↓
  Return { answer: "..." } to frontend
```

#### Pros

| # | Pro |
|---|-----|
| 1 | **Simplest architecture** — everything runs in the Next.js process. No child processes, no stdio pipes, no transport layer. |
| 2 | **Lowest latency** — function calls are synchronous JS (SQLite is sync via better-sqlite3). Only the LLM call adds latency. |
| 3 | **Type-safe** — functions are imported with full TypeScript types. The tool definitions you send to the LLM are hand-crafted JSON schemas that match the actual function signatures. |
| 4 | **Easy to debug** — you can log every function call and result in the API route. No inter-process communication to trace. |
| 5 | **No extra dependencies** — you already have all the query functions. Only need to add the LLM SDK (`openai` or `@anthropic-ai/sdk`). |
| 6 | **Works in serverless** — Vercel, Netlify, etc. can run this since it's a normal API route. No long-lived child process needed. |

#### Cons

| # | Con |
|---|-----|
| 1 | **Duplicates tool definitions** — MCP tools already describe the same functions with Zod schemas. Approach 2 requires re-describing them as OpenAI/Anthropic function schemas. If you add a new query function, you update it in two places (MCP tools + LLM tool definitions). |
| 2 | **No MCP ecosystem benefit** — the MCP server becomes a separate, parallel system. The in-app Ask doesn't benefit from MCP's tool registry or any future MCP features (resources, prompts, sampling). |
| 3 | **Manual tool dispatch** — you write a `switch` statement mapping LLM tool-call names to actual functions. Adding a tool means updating the switch. |

#### Effort: ~3–4 hours

| Task | Time | Details |
|------|------|---------|
| Install LLM SDK + env config | 15 min | `npm install openai` or `@anthropic-ai/sdk`, add `OPENAI_API_KEY` to `.env.local` |
| Define LLM tool schemas | 45 min | Convert 8–10 key functions into OpenAI-format `tools[]` array with JSON Schema parameters |
| Rewrite `/api/ask` route | 60 min | Replace switch-based handler with LLM conversation loop (send tools → receive tool_call → execute → send result → get final answer) |
| System prompt engineering | 30 min | Write prompt with DB schema context, performance level ranges, current roster/test info |
| Update `useAsk` hook | 15 min | Change from `{ query, rosterId, testId }` to `{ message, rosterId, testId, testId2? }` |
| Rewrite `AskPanel` UI | 45 min | Replace card grid with text input + send button, keep chat history, optionally keep cards as "suggested questions" |
| Testing & prompt tuning | 30 min | Test edge cases, refine system prompt, handle multi-tool chains |

---

### Approach 3: LLM + MCP Client (Full MCP Integration)

The API route spawns the MCP server as a child process (or connects via SSE), uses the MCP Client SDK to discover available tools, converts them to LLM function-calling format automatically, and routes tool calls through the MCP protocol.

```
Teacher types: "Who's struggling the most without any help?"
        ↓
  POST /api/ask  { message: "...", rosterId, testId, testId2? }
        ↓
  API route connects MCP Client → MCP Server (stdio or SSE)
        ↓
  MCP Client calls client.listTools() → gets 19 tool definitions with Zod schemas
        ↓
  Auto-convert MCP tool schemas → OpenAI/Anthropic function-calling format
        ↓
  Call LLM with all 19 tools available
        ↓
  LLM returns tool_call: e.g. query_students_natural(...)
        ↓
  MCP Client calls client.callTool("query_students_natural", { ... })
        ↓
  MCP Server executes tool, returns result via MCP protocol
        ↓
  Send tool result back to LLM for summarization
        ↓
  Return { answer: "..." } to frontend
```

#### Pros

| # | Pro |
|---|-----|
| 1 | **Single source of truth** — tool definitions live only in the MCP server. The API route auto-discovers them via `client.listTools()`. Add a tool to `src/mcp/tools/`, and the Ask panel can use it immediately with zero glue code changes. |
| 2 | **MCP ecosystem ready** — if MCP adds features like Resources (context injection), Prompts (pre-built prompt templates), or Sampling (LLM-in-the-loop), you get them for free. |
| 3 | **Same tools everywhere** — Claude Desktop, VS Code Copilot, and the in-app Ask panel all use the exact same tool implementations. Bug fixes and improvements propagate everywhere. |
| 4 | **No manual dispatch** — the MCP Client handles tool routing. You never write switch statements mapping tool names to functions. |
| 5 | **Architecturally correct** — this is the intended MCP pattern: server provides tools, client (with LLM) consumes them. The in-app Ask becomes just another MCP client. |

#### Cons

| # | Con |
|---|-----|
| 1 | **Child process management** — stdio transport requires spawning `tsx src/mcp/server.ts` as a child process. Need to handle lifecycle (startup, shutdown, crashes, restarts). In serverless (Vercel), a long-lived child process is problematic. |
| 2 | **Higher latency** — every tool call goes through JSON-RPC over stdio pipes (serialize → pipe → deserialize → execute → serialize → pipe → deserialize). For a sync SQLite query that takes <1ms, the IPC overhead is disproportionate. |
| 3 | **SSE alternative is complex** — to avoid child processes, you could use SSE transport, but that requires running the MCP server as a separate HTTP service (another port, another process to manage, CORS, health checks). |
| 4 | **Schema conversion layer** — MCP uses Zod schemas; OpenAI/Anthropic use JSON Schema. You need a converter (`zod-to-json-schema` or manual mapping). This is solvable but adds a dependency and edge cases. |
| 5 | **Harder to debug** — tool calls cross process boundaries. Errors in the MCP server may surface as opaque "tool call failed" messages in the API route. Need structured logging on both sides. |
| 6 | **Over-engineered for this use case** — both the MCP server and the Next.js app read the same SQLite file. The MCP transport adds a layer of indirection with no architectural benefit when both processes are on the same machine reading the same DB. |

#### Effort: ~5–7 hours

| Task | Time | Details |
|------|------|---------|
| Install LLM SDK + env config | 15 min | Same as Approach 2 |
| MCP Client wrapper | 60 min | Create `src/lib/mcp-client.ts` that manages child process lifecycle, connects `Client`, handles reconnection |
| Schema conversion utility | 45 min | Convert Zod-based MCP tool schemas to OpenAI JSON Schema format (`zodToJsonSchema` or manual) |
| Rewrite `/api/ask` route | 75 min | Connect MCP Client, list tools, convert schemas, LLM conversation loop with `client.callTool()` |
| System prompt engineering | 30 min | Same as Approach 2, but tool descriptions come from MCP so less manual work |
| Update `useAsk` hook | 15 min | Same as Approach 2 |
| Rewrite `AskPanel` UI | 45 min | Same as Approach 2 |
| Process management | 30 min | Graceful shutdown, error recovery, connection pooling (reuse MCP client across requests) |
| Testing & debugging | 45 min | Test IPC reliability, tool call failures, LLM ↔ MCP round-trips |

---

## Recommendation

**Go with Approach 2 (direct function calls) for the hackathon.** It's simpler, faster to build, and the MCP server continues to serve its purpose for external AI clients (Claude Desktop, VS Code). The in-app Ask doesn't need MCP's transport layer when it can call the same functions directly.

Approach 3 makes sense if this evolves into a production app where:
- Multiple services need the same tool definitions
- You want the MCP server to be the canonical "data API brain"
- You plan to use MCP Resources/Prompts/Sampling features
- You're running on infrastructure that supports long-lived processes

---

## Implementation Plan (Approach 2)

### 1. Dependencies

```bash
npm install openai
# OR for Anthropic:
npm install @anthropic-ai/sdk
```

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Model selection
LLM_PROVIDER=openai          # or "anthropic"
LLM_MODEL=gpt-4o-mini        # or "claude-sonnet-4-20250514"
```

### 2. Folder Structure Changes

```
src/
├── lib/
│   ├── llm.ts               # LLM client singleton + tool-calling loop
│   ├── tool-defs.ts          # Tool definitions (JSON Schema format) for the LLM
│   ├── tool-dispatch.ts      # Maps tool-call names → lib/ function calls
│   ├── queries.ts            # (existing, no changes)
│   └── impact.ts             # (existing, no changes)
├── app/api/ask/
│   └── route.ts              # Rewritten: accepts { message }, runs LLM loop
├── components/
│   ├── AskPanel.tsx           # Rewritten: text input + chat history
│   └── AskButton.tsx          # (no changes)
└── hooks/
    └── useAsk.ts              # Updated: sends free-text message instead of query type
```

### 3. LLM Client — `src/lib/llm.ts`

Singleton wrapper around the LLM SDK. Handles:
- Provider selection (OpenAI or Anthropic) based on env var
- Tool-calling conversation loop (send → tool_call → execute → send result → final answer)
- Token/cost guardrails (max 4 tool calls per request, max 2000 output tokens)

```typescript
// Pseudocode structure
export async function askWithTools(
  userMessage: string,
  systemPrompt: string,
  tools: ToolDefinition[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>
): Promise<string> {
  // 1. Send system + user message + tool definitions to LLM
  // 2. If LLM returns tool_call(s):
  //    a. Execute each tool via executeTool()
  //    b. Append tool results to conversation
  //    c. Send back to LLM (loop, max 4 iterations)
  // 3. Return final text response
}
```

### 4. Tool Definitions — `src/lib/tool-defs.ts`

Map the most useful `lib/queries.ts` and `lib/impact.ts` functions to LLM tool schemas. **Don't expose all 19 MCP tools** — curate the ~10 most useful for teacher questions:

| Tool Name | Wraps | Purpose |
|-----------|-------|---------|
| `get_student_list` | `getStudentList()` | List/filter/search students |
| `get_student_detail` | `getStudentDetail()` | Deep dive on one student |
| `get_performance_distribution` | `getPerformanceDistribution()` | Level breakdown |
| `get_rc_breakdown` | `getRCBreakdown()` | RC scores by level |
| `get_standards_breakdown` | `getStandardsBreakdown()` | Standards heatmap data |
| `get_students_by_standard` | `getStudentsByStandard()` | Who's struggling on a standard |
| `get_assignments` | `getAssignments()` | List assignments + completion |
| `get_student_assignments` | `getStudentAssignments()` | One student's assignments |
| `get_assignment_impact` | `calculateAssignmentImpact()` | DiD for one assignment |
| `get_all_impacts` | `calculateAllImpacts()` | Ranked impact summary |
| `query_analytics` | (raw SQL in route) | The 6 analytical queries (drops, gains, etc.) |

Each tool definition includes a JSON Schema for parameters and a clear description the LLM can reason about.

### 5. Tool Dispatcher — `src/lib/tool-dispatch.ts`

```typescript
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_student_list":
      return JSON.stringify(getStudentList(args.rosterId, args.testId, { ... }));
    case "get_performance_distribution":
      return JSON.stringify(getPerformanceDistribution(args.rosterId, args.testId));
    // ... etc
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
```

### 6. System Prompt

The system prompt is critical. It should include:

```
You are a helpful teaching assistant for an elementary school teacher.
You have access to a student performance dashboard with test scores,
assignments, and impact analysis.

CONTEXT:
- Current roster: {rosterName} (ID: {rosterId})
- Current test: {testName} (ID: {testId})
- Compare test: {compareTestName} (ID: {testId2}) [if available]
- Score range: 5100–5800 (scale scores, NOT percentages)
- Performance levels: Beginning (<5410), Approaching (5410–5469),
  Understands (5470–5529), Advanced (≥5530)
- Proficiency threshold: 5470 (Level 3+)

GUIDELINES:
- Always use the current roster and test context unless the user specifies otherwise
- Format responses for teachers: use simple language, bullet points, student names
- When showing scores, include the performance level label
- If the question is about score changes, use both testId and testId2
- Limit results to top/bottom 10 unless asked for more
- Never show raw JSON — always summarize in natural language
```

### 7. API Route — `src/app/api/ask/route.ts`

**Rewrite** the existing route to accept free-text messages:

```typescript
// Request body
interface AskRequest {
  message: string;          // Free-text from the teacher
  rosterId: number;
  testId: number;
  testId2?: number;         // For comparison queries
}

// Response
interface AskResponse {
  answer: string;           // LLM-generated natural language answer
}
```

The route:
1. Builds the system prompt with context (roster name, test name, etc.)
2. Calls `askWithTools()` with the user's message, tool definitions, and dispatcher
3. Returns `{ answer }` 

### 8. Frontend — `AskPanel.tsx`

Replace the card grid with a text input:

```
┌──────────────────────────────────────┐
│ ✨ Ask About Your Class              │
│ ──────────────────────────────────── │
│ Compare test: [PM2 ▾]               │
│ ──────────────────────────────────── │
│                                      │
│  (empty state or chat messages)      │
│                                      │
│  ┌──────────────────┐               │
│  │ User: Who's      │               │
│  │ struggling most? │               │
│  └──────────────────┘               │
│  ┌──────────────────────────────┐   │
│  │ Assistant: Here are the 5    │   │
│  │ lowest-performing students   │   │
│  │ with no assignments:         │   │
│  │ • Maria G. — 5180 (Begin.)  │   │
│  │ • James T. — 5210 (Begin.)  │   │
│  │ ...                          │   │
│  └──────────────────────────────┘   │
│                                      │
│ ──────────────────────────────────── │
│ ┌────────────────────────────┐ [➤] │
│ │ Ask a question...          │      │
│ └────────────────────────────┘      │
│                                      │
│ Suggested:                           │
│ [Struggling without help]            │
│ [Biggest score drops] [Completion]   │
└──────────────────────────────────────┘
```

Key UI changes:
- **Text input** at the bottom with send button
- **Suggested question chips** (optional) that insert text into the input
- Keep **chat message history** (already works from Phase 10)
- Keep **compare test selector** (already works)
- Remove the 9 card grid (or collapse into suggestion chips)

### 9. Updated Hook — `useAsk.ts`

```typescript
interface AskParams {
  message: string;        // Free-text (was: query: QueryType)
  rosterId: number;
  testId: number;
  testId2?: number;
}
```

The mutation function posts `{ message, rosterId, testId, testId2 }` instead of a typed query enum.

---

## Implementation Plan (Approach 3) — For Reference

If pursuing the full MCP Client integration later, here are the **additional** pieces needed beyond what Approach 2 requires:

### 3a. MCP Client Wrapper — `src/lib/mcp-client.ts`

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let clientInstance: Client | null = null;

export async function getMcpClient(): Promise<Client> {
  if (clientInstance) return clientInstance;

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp/server.ts"],
  });

  const client = new Client({ name: "ask-panel", version: "1.0.0" });
  await client.connect(transport);
  clientInstance = client;
  return client;
}

export async function listMcpTools() {
  const client = await getMcpClient();
  return client.listTools();
}

export async function callMcpTool(name: string, args: Record<string, unknown>) {
  const client = await getMcpClient();
  return client.callTool({ name, arguments: args });
}
```

### 3b. Schema Converter — `src/lib/mcp-schema-converter.ts`

Converts MCP's Zod-based `inputSchema` (JSON Schema format from `listTools()`) to the LLM provider's function-calling format. MCP already returns JSON Schema, so for OpenAI this is mostly a structural reshaping:

```typescript
function mcpToolToOpenAI(mcpTool: Tool): OpenAI.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: mcpTool.name,
      description: mcpTool.description ?? "",
      parameters: mcpTool.inputSchema,   // MCP already uses JSON Schema
    },
  };
}
```

### 3c. Modified API Route

Instead of importing `lib/queries.ts` and dispatching manually, the route:
1. Calls `listMcpTools()` to discover available tools
2. Converts schemas to LLM format
3. When LLM returns a tool_call, calls `callMcpTool(name, args)` 
4. Passes result back to LLM

### 3d. Process Lifecycle Concerns

- **Singleton pattern**: reuse one MCP child process across all requests (module-level variable)
- **Graceful shutdown**: kill child process on `process.on('exit')`
- **Crash recovery**: if `client.callTool()` throws, reconnect
- **Serverless incompatibility**: Vercel/Netlify Functions spin down between requests — the child process dies. Would need SSE transport with a separate always-on MCP server process, which defeats the simplicity goal

---

## Available MCP Tools (19 total, for reference)

These are the tools the MCP server already exposes. Approach 3 would auto-discover all of them; Approach 2 manually wraps the ~10 most useful.

| # | Tool | Group | Description |
|---|------|-------|-------------|
| 1 | `list_rosters` | Roster | List all class rosters |
| 2 | `list_students` | Roster | List/filter/search students with scores |
| 3 | `get_student_detail` | Roster | Full student detail (all tests, RCs, standards) |
| 4 | `get_performance_distribution` | Performance | Level breakdown counts & percentages |
| 5 | `get_rc_breakdown` | Performance | RC averages by performance level |
| 6 | `get_performance_levels` | Performance | Level definitions & score ranges |
| 7 | `list_test_groups` | Performance | Test group listing |
| 8 | `list_tests` | Performance | Tests in a group with dates |
| 9 | `list_assignments` | Assignments | All assignments with completion stats |
| 10 | `get_student_assignments` | Assignments | One student's assignments |
| 11 | `create_assignment` | Assignments | Create new assignment |
| 12 | `delete_assignment` | Assignments | Delete assignment |
| 13 | `get_assignment_impact` | Impact | DiD for one assignment |
| 14 | `get_all_impacts` | Impact | All assignments DiD ranked |
| 15 | `get_standard_level_impact` | Impact | Per-standard DiD for an assignment |
| 16 | `get_standards_breakdown` | Standards | Class-wide standard performance |
| 17 | `get_students_by_standard` | Standards | Students sorted by standard score |
| 18 | `list_reporting_categories` | Standards | RC + standards hierarchy |
| 19 | `query_students_natural` | Analytics | 6 canned analytical queries |

---

## What NOT to Do

- Do not remove the MCP server — it continues to serve Claude Desktop / VS Code Copilot.
- Do not expose the LLM API key to the client — all LLM calls happen server-side in the API route.
- Do not allow write operations through Ask (no `create_assignment` or `delete_assignment` via free-text). Read-only tools only.
- Do not send all 19 tools to the LLM — curate the most useful ~10 to reduce token cost and improve tool selection accuracy.
- Do not remove the "Suggested questions" — keep them as quick-tap chips below the text input for discoverability.
- Do not stream responses for the hackathon — simpler to wait for the full answer. Streaming can be added later.

---

## Testing Checklist

- [ ] Free-text questions return relevant answers
- [ ] Context (roster, test) is automatically injected — teacher doesn't have to specify
- [ ] Multi-tool chains work (e.g., "Show me struggling students and the weakest standards" triggers 2 tools)
- [ ] Error handling: LLM API down, invalid tool call, empty results
- [ ] Suggested question chips work as text insertion shortcuts
- [ ] Chat history persists within the panel session
- [ ] Clear button resets conversation
- [ ] Compare test selector still works for score-change questions
- [ ] Response formatting: markdown-lite renders bullets, bold, headers
- [ ] No API key exposed in client-side code or network tab
