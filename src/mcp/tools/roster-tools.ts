import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { rosters } from "../../lib/schema.js";
import { getStudentList, getStudentDetail } from "../../lib/queries.js";

export function registerRosterTools(server: McpServer) {
  // ── list_rosters ─────────────────────────────────────────────────────────
  server.tool(
    "list_rosters",
    "List all class rosters. Returns roster IDs and names.",
    {},
    async () => {
      const allRosters = db.select().from(rosters).all();

      if (allRosters.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No rosters found. Run seed first." }],
        };
      }

      const lines = allRosters.map(
        (r) => `• Roster ${r.id}: ${r.name} (created: ${r.createdAt ?? "unknown"})`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${allRosters.length} roster(s):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── list_students ────────────────────────────────────────────────────────
  server.tool(
    "list_students",
    "List students in a roster with their scores on a specific test. Supports filtering by performance level (1=Beginning, 2=Approaching, 3=Understands, 4=Advanced), name search, and sorting.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID to show scores for"),
      level: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe("Filter by performance level: 1=Beginning, 2=Approaching, 3=Understands, 4=Advanced"),
      search: z.string().optional().describe("Search students by name (partial match)"),
      sort: z
        .enum(["name", "level", "overallScore"])
        .optional()
        .describe("Sort field (default: name)"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)"),
    },
    async ({ rosterId, testId, level, search, sort, order }) => {
      const result = getStudentList(rosterId, testId, { level, search, sort, order });

      if (result.students.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No students found matching the criteria." }],
        };
      }

      const levelNames: Record<number, string> = {
        1: "Beginning",
        2: "Approaching",
        3: "Understands",
        4: "Advanced",
      };

      const lines = result.students.map(
        (s) =>
          `• ${s.name} (ID: ${s.id}) — ${levelNames[s.level] ?? `Level ${s.level}`} — Score: ${s.overallScore} — ${s.assignmentCount} assignment(s)`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${result.total} student(s):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── get_student_detail ───────────────────────────────────────────────────
  server.tool(
    "get_student_detail",
    "Get comprehensive detail for a single student: all test scores across PM windows, reporting category scores, and individual standard scores.",
    {
      studentId: z.number().describe("The student ID"),
    },
    async ({ studentId }) => {
      const detail = getStudentDetail(studentId);

      if (!detail) {
        return {
          content: [{ type: "text" as const, text: `Student with ID ${studentId} not found.` }],
        };
      }

      const levelNames: Record<number, string> = {
        1: "Beginning",
        2: "Approaching",
        3: "Understands",
        4: "Advanced",
      };

      let text = `## ${detail.name}\n`;
      text += `Roster: ${detail.rosterName} (ID: ${detail.rosterId})\n`;
      if (detail.externalId) text += `External ID: ${detail.externalId}\n`;
      text += `\n### Test Score History\n`;

      for (const score of detail.scores) {
        text += `\n**${score.testName}** (${score.administeredAt ?? "date unknown"})\n`;
        text += `  Overall: ${score.overallScore} — ${levelNames[score.level] ?? `Level ${score.level}`}\n`;

        // RC scores
        const rcEntries = Object.entries(score.rcScores);
        if (rcEntries.length > 0) {
          text += `  Reporting Categories:\n`;
          for (const [, rc] of rcEntries) {
            text += `    • ${rc.name}: ${rc.score}\n`;
          }
        }

        // Standard scores (summarized)
        const stdEntries = Object.entries(score.stdScores);
        if (stdEntries.length > 0) {
          text += `  Standards (${stdEntries.length} total):\n`;
          // Show top 5 weakest
          const sorted = [...stdEntries].sort((a, b) => a[1].score - b[1].score);
          const weakest = sorted.slice(0, 5);
          for (const [, std] of weakest) {
            text += `    • ${std.code}: ${std.score} — ${std.description.substring(0, 60)}${std.description.length > 60 ? "..." : ""}\n`;
          }
          if (stdEntries.length > 5) {
            text += `    ... and ${stdEntries.length - 5} more standards\n`;
          }
        }
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
