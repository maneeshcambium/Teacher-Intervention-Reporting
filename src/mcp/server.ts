import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRosterTools } from "./tools/roster-tools.js";
import { registerPerformanceTools } from "./tools/performance-tools.js";
import { registerAssignmentTools } from "./tools/assignment-tools.js";
import { registerImpactTools } from "./tools/impact-tools.js";
import { registerStandardsTools } from "./tools/standards-tools.js";
import { registerAnalyticsTools } from "./tools/analytics-tools.js";

const server = new McpServer({
  name: "teacher-dashboard",
  version: "1.0.0",
});

// Register all tool groups
registerRosterTools(server);
registerPerformanceTools(server);
registerAssignmentTools(server);
registerImpactTools(server);
registerStandardsTools(server);
registerAnalyticsTools(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Teacher Dashboard MCP Server running on stdio");
}

main().catch(console.error);
