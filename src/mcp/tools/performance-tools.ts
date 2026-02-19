import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, sqlite } from "../../lib/db.js";
import { testGroups, tests } from "../../lib/schema.js";
import { asc, eq } from "drizzle-orm";
import {
  getPerformanceDistribution,
  getRCBreakdown,
  getPerformanceLevels,
} from "../../lib/queries.js";

export function registerPerformanceTools(server: McpServer) {
  // ── get_performance_distribution ─────────────────────────────────────────
  server.tool(
    "get_performance_distribution",
    "Get the count and percentage of students at each performance level (Beginning, Approaching, Understands, Advanced) for a roster on a specific test.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID"),
    },
    async ({ rosterId, testId }) => {
      const result = getPerformanceDistribution(rosterId, testId);

      const lines = result.levels.map(
        (l) =>
          `• Level ${l.level} (${l.name}): ${l.count} students (${l.percentage}%) — ${l.description}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Performance Distribution (${result.total} students total):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── get_rc_breakdown ─────────────────────────────────────────────────────
  server.tool(
    "get_rc_breakdown",
    "Get average Reporting Category (RC) scores broken down by performance level. Scale scores range ~5100–5800; proficiency threshold is 5470.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID"),
    },
    async ({ rosterId, testId }) => {
      const result = getRCBreakdown(rosterId, testId);

      const levelNames: Record<number, string> = {
        1: "Beginning",
        2: "Approaching",
        3: "Understands",
        4: "Advanced",
      };

      let text = "Reporting Category Breakdown by Performance Level:\n\n";

      for (const cat of result.categories) {
        text += `**${cat.rcName}** (RC ID: ${cat.rcId})\n`;
        for (const bl of cat.byLevel) {
          const belowProf = bl.avgScore < 5470 ? " ⚠ below proficiency" : "";
          text += `  Level ${bl.level} (${levelNames[bl.level]}): avg ${bl.avgScore}${belowProf}\n`;
        }
        text += "\n";
      }

      text += "Note: Proficiency threshold = 5470. Scores below this indicate students need targeted support.";

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ── get_performance_levels ───────────────────────────────────────────────
  server.tool(
    "get_performance_levels",
    "List all performance level definitions with score ranges and color coding.",
    {},
    async () => {
      const levels = getPerformanceLevels();

      const lines = levels.map(
        (l) =>
          `• Level ${l.level}: ${l.name} — ${l.description} — Score range: ${l.minScore}${l.maxScore ? `–${l.maxScore}` : "+"} — Color: ${l.color}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Performance Levels:\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── list_test_groups ─────────────────────────────────────────────────────
  server.tool(
    "list_test_groups",
    "List all test groups (e.g., '2024-25 Progress Monitoring'). Each test group contains sequential tests (PM1, PM2, etc.).",
    {},
    async () => {
      const groups = db.select().from(testGroups).all();

      if (groups.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No test groups found. Run seed first." }],
        };
      }

      const lines = groups.map((g) => `• Group ${g.id}: ${g.name}`);

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${groups.length} test group(s):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── list_tests ───────────────────────────────────────────────────────────
  server.tool(
    "list_tests",
    "List all tests in a test group with sequence numbers and administration dates. Tests are sequential Progress Monitoring assessments (PM1, PM2, PM3, etc.).",
    {
      groupId: z.number().describe("The test group ID"),
    },
    async ({ groupId }) => {
      const allTests = db
        .select()
        .from(tests)
        .where(eq(tests.groupId, groupId))
        .orderBy(asc(tests.sequence))
        .all();

      if (allTests.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No tests found in group ${groupId}.`,
            },
          ],
        };
      }

      const lines = allTests.map(
        (t) =>
          `• Test ${t.id}: ${t.name} (sequence ${t.sequence}, administered: ${t.administeredAt ?? "TBD"})`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Tests in group ${groupId}:\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );
}
