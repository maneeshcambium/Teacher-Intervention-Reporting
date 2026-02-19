/**
 * MCP Client wrapper — connects to the teacher-dashboard MCP server
 * as a child process (stdio transport), auto-discovers tools, and
 * provides callTool() for the LLM loop.
 *
 * Phase 11 — Approach 3: LLM + MCP Client
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema from MCP
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// ─── Singleton management ──────────────────────────────────────────────────

let clientInstance: Client | null = null;
let transportInstance: StdioClientTransport | null = null;
let connectPromise: Promise<void> | null = null;

/**
 * Get (or create) a singleton MCP Client connected to the
 * teacher-dashboard server via stdio.
 */
async function ensureConnected(): Promise<Client> {
  if (clientInstance) return clientInstance;

  // Prevent concurrent connection attempts
  if (connectPromise) {
    await connectPromise;
    return clientInstance!;
  }

  connectPromise = (async () => {
    const serverPath = path.join(process.cwd(), "src", "mcp", "server.ts");

    transportInstance = new StdioClientTransport({
      command: "npx",
      args: ["tsx", serverPath],
      cwd: process.cwd(),
      stderr: "pipe", // capture stderr so it doesn't pollute stdout
    });

    const client = new Client(
      { name: "ask-panel-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transportInstance);
    clientInstance = client;
    console.log("[mcp-client] Connected to teacher-dashboard MCP server");
  })();

  try {
    await connectPromise;
  } finally {
    connectPromise = null;
  }

  return clientInstance!;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * List all tools available on the MCP server.
 * Returns tool name, description, and JSON Schema for parameters.
 */
export async function listMcpTools(): Promise<McpToolDef[]> {
  const client = await ensureConnected();
  const result = await client.listTools();

  return result.tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
  }));
}

/**
 * Call a tool on the MCP server by name with the given arguments.
 * Returns the text content from the tool result.
 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const client = await ensureConnected();

  const result = await client.callTool({ name, arguments: args });

  // Extract text from content array
  const textParts = (result.content as McpToolResult["content"])
    .filter((c) => c.type === "text")
    .map((c) => c.text);

  return textParts.join("\n");
}

/**
 * Disconnect the MCP client and kill the child process.
 * Called on server shutdown to clean up.
 */
export async function disconnectMcpClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.close();
    } catch {
      // ignore close errors
    }
    clientInstance = null;
  }
  if (transportInstance) {
    try {
      await transportInstance.close();
    } catch {
      // ignore close errors
    }
    transportInstance = null;
  }
  console.log("[mcp-client] Disconnected");
}

// Clean up on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => disconnectMcpClient());
}
