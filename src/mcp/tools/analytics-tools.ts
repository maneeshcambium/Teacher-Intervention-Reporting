import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sqlite } from "../../lib/db.js";

/**
 * Higher-level analytical queries that answer common teacher questions
 * by combining data across multiple tables with raw SQL.
 */
export function registerAnalyticsTools(server: McpServer) {
  // ── query_students_natural ───────────────────────────────────────────────
  server.tool(
    "query_students_natural",
    `Run common analytical queries about student performance. Available queries:
- worst_despite_completing: Students who completed assignments but still score lowest
- biggest_score_drops: Students whose scores decreased between two tests
- biggest_score_gains: Students whose scores increased the most between two tests
- level_changes: Students who changed performance levels between two tests
- unassigned_struggling: Low-performing students (Level 1-2) with NO assignments
- assignment_completion_rates: Assignment completion rates per student, ranked by least complete`,
    {
      query: z
        .enum([
          "worst_despite_completing",
          "biggest_score_drops",
          "biggest_score_gains",
          "level_changes",
          "unassigned_struggling",
          "assignment_completion_rates",
        ])
        .describe("The type of analytical query to run"),
      rosterId: z.number().describe("Roster ID"),
      testId1: z.number().describe("First test ID (earlier/pre test)"),
      testId2: z
        .number()
        .optional()
        .describe("Second test ID (later/post test) — required for comparison queries like score drops/gains/level changes"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default: 10)"),
    },
    async ({ query, rosterId, testId1, testId2, limit }) => {
      const maxRows = limit ?? 10;

      const levelNames: Record<number, string> = {
        1: "Beginning",
        2: "Approaching",
        3: "Understands",
        4: "Advanced",
      };

      try {
        switch (query) {
          case "worst_despite_completing": {
            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name, sc.overall_score as overallScore, sc.level,
                        GROUP_CONCAT(DISTINCT a.name) as completedAssignments,
                        COUNT(DISTINCT asn.assignment_id) as completedCount
                 FROM students s
                 JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
                 JOIN assignment_students asn ON asn.student_id = s.id AND asn.status = 'completed'
                 JOIN assignments a ON a.id = asn.assignment_id
                 WHERE s.roster_id = ?
                 GROUP BY s.id
                 ORDER BY sc.overall_score ASC
                 LIMIT ?`
              )
              .all(testId1, rosterId, maxRows) as Array<{
              id: number;
              name: string;
              overallScore: number;
              level: number;
              completedAssignments: string;
              completedCount: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "No students found who have completed assignments. Check if any assignments have been marked as completed.",
                  },
                ],
              };
            }

            let text = "## Students Who Performed Worst Despite Completing Assignments\n\n";
            text += "These students completed intervention assignments but still have the lowest scores:\n\n";

            for (const r of rows) {
              text += `• **${r.name}** (ID: ${r.id}) — Score: ${r.overallScore} (${levelNames[r.level] ?? `Level ${r.level}`})\n`;
              text += `  Completed ${r.completedCount} assignment(s): ${r.completedAssignments}\n\n`;
            }

            text += "Recommendation: These students may need different intervention strategies or more targeted support.";
            return { content: [{ type: "text" as const, text }] };
          }

          case "biggest_score_drops": {
            if (!testId2) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "Error: testId2 is required for score comparison queries. Provide both a pre-test and post-test ID.",
                  },
                ],
              };
            }

            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name,
                        sc1.overall_score as preScore, sc1.level as preLevel,
                        sc2.overall_score as postScore, sc2.level as postLevel,
                        (sc2.overall_score - sc1.overall_score) as delta
                 FROM students s
                 JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = ?
                 JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = ?
                 WHERE s.roster_id = ?
                 ORDER BY delta ASC
                 LIMIT ?`
              )
              .all(testId1, testId2, rosterId, maxRows) as Array<{
              id: number;
              name: string;
              preScore: number;
              preLevel: number;
              postScore: number;
              postLevel: number;
              delta: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [{ type: "text" as const, text: "No matching students found." }],
              };
            }

            let text = "## Biggest Score Drops\n\n";
            text += "Students whose scores decreased the most between tests:\n\n";

            for (const r of rows) {
              const levelChange =
                r.postLevel !== r.preLevel
                  ? ` (${levelNames[r.preLevel]} → ${levelNames[r.postLevel]})`
                  : "";
              text += `• **${r.name}** (ID: ${r.id}): ${r.preScore} → ${r.postScore} (${r.delta >= 0 ? "+" : ""}${r.delta} pts)${levelChange}\n`;
            }

            return { content: [{ type: "text" as const, text }] };
          }

          case "biggest_score_gains": {
            if (!testId2) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "Error: testId2 is required for score comparison queries.",
                  },
                ],
              };
            }

            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name,
                        sc1.overall_score as preScore, sc1.level as preLevel,
                        sc2.overall_score as postScore, sc2.level as postLevel,
                        (sc2.overall_score - sc1.overall_score) as delta
                 FROM students s
                 JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = ?
                 JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = ?
                 WHERE s.roster_id = ?
                 ORDER BY delta DESC
                 LIMIT ?`
              )
              .all(testId1, testId2, rosterId, maxRows) as Array<{
              id: number;
              name: string;
              preScore: number;
              preLevel: number;
              postScore: number;
              postLevel: number;
              delta: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [{ type: "text" as const, text: "No matching students found." }],
              };
            }

            let text = "## Biggest Score Gains\n\n";
            text += "Students whose scores increased the most between tests:\n\n";

            for (const r of rows) {
              const levelChange =
                r.postLevel !== r.preLevel
                  ? ` (${levelNames[r.preLevel]} → ${levelNames[r.postLevel]})`
                  : "";
              text += `• **${r.name}** (ID: ${r.id}): ${r.preScore} → ${r.postScore} (+${r.delta} pts)${levelChange}\n`;
            }

            return { content: [{ type: "text" as const, text }] };
          }

          case "level_changes": {
            if (!testId2) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "Error: testId2 is required for level change queries.",
                  },
                ],
              };
            }

            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name,
                        sc1.level as preLevel, sc2.level as postLevel,
                        (sc2.level - sc1.level) as levelChange,
                        sc1.overall_score as preScore, sc2.overall_score as postScore
                 FROM students s
                 JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = ?
                 JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = ?
                 WHERE s.roster_id = ? AND sc1.level != sc2.level
                 ORDER BY levelChange ASC`
              )
              .all(testId1, testId2, rosterId) as Array<{
              id: number;
              name: string;
              preLevel: number;
              postLevel: number;
              levelChange: number;
              preScore: number;
              postScore: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "No students changed performance levels between these tests.",
                  },
                ],
              };
            }

            const dropped = rows.filter((r) => r.levelChange < 0);
            const improved = rows.filter((r) => r.levelChange > 0);

            let text = "## Performance Level Changes\n\n";

            if (dropped.length > 0) {
              text += `### ⬇️ Dropped Level (${dropped.length} students)\n`;
              for (const r of dropped) {
                text += `• **${r.name}** (ID: ${r.id}): ${levelNames[r.preLevel]} → ${levelNames[r.postLevel]} (${r.preScore} → ${r.postScore})\n`;
              }
              text += "\n";
            }

            if (improved.length > 0) {
              text += `### ⬆️ Improved Level (${improved.length} students)\n`;
              for (const r of improved) {
                text += `• **${r.name}** (ID: ${r.id}): ${levelNames[r.preLevel]} → ${levelNames[r.postLevel]} (${r.preScore} → ${r.postScore})\n`;
              }
            }

            return { content: [{ type: "text" as const, text }] };
          }

          case "unassigned_struggling": {
            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name, sc.overall_score as overallScore, sc.level
                 FROM students s
                 JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
                 WHERE s.roster_id = ?
                   AND sc.level <= 2
                   AND s.id NOT IN (SELECT student_id FROM assignment_students)
                 ORDER BY sc.overall_score ASC
                 LIMIT ?`
              )
              .all(testId1, rosterId, maxRows) as Array<{
              id: number;
              name: string;
              overallScore: number;
              level: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "All struggling students (Level 1–2) already have assignments. Great job!",
                  },
                ],
              };
            }

            let text = "## Struggling Students Without Assignments\n\n";
            text += "These students are at Level 1 (Beginning) or Level 2 (Approaching) but have NO intervention assignments:\n\n";

            for (const r of rows) {
              text += `• **${r.name}** (ID: ${r.id}) — Score: ${r.overallScore} (${levelNames[r.level]})\n`;
            }

            text += "\nRecommendation: Consider creating targeted assignments for these students.";
            return { content: [{ type: "text" as const, text }] };
          }

          case "assignment_completion_rates": {
            const rows = sqlite
              .prepare(
                `SELECT s.id, s.name,
                        COUNT(asn.assignment_id) as totalAssignments,
                        SUM(CASE WHEN asn.status = 'completed' THEN 1 ELSE 0 END) as completed,
                        SUM(CASE WHEN asn.status = 'started' THEN 1 ELSE 0 END) as started,
                        SUM(CASE WHEN asn.status = 'not_started' THEN 1 ELSE 0 END) as notStarted,
                        sc.overall_score as overallScore, sc.level
                 FROM students s
                 JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
                 JOIN assignment_students asn ON asn.student_id = s.id
                 WHERE s.roster_id = ?
                 GROUP BY s.id
                 ORDER BY CAST(completed AS REAL) / COUNT(asn.assignment_id) ASC
                 LIMIT ?`
              )
              .all(testId1, rosterId, maxRows) as Array<{
              id: number;
              name: string;
              totalAssignments: number;
              completed: number;
              started: number;
              notStarted: number;
              overallScore: number;
              level: number;
            }>;

            if (rows.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "No students with assignments found.",
                  },
                ],
              };
            }

            let text = "## Assignment Completion Rates\n\n";
            text += "Students ranked by lowest completion rate first:\n\n";

            for (const r of rows) {
              const pct =
                r.totalAssignments > 0
                  ? Math.round((r.completed / r.totalAssignments) * 100)
                  : 0;
              text += `• **${r.name}** (ID: ${r.id}) — ${pct}% complete (${r.completed}/${r.totalAssignments})`;
              text += ` — ${r.started} in progress, ${r.notStarted} not started`;
              text += ` — Score: ${r.overallScore} (${levelNames[r.level]})\n`;
            }

            return { content: [{ type: "text" as const, text }] };
          }

          default:
            return {
              content: [{ type: "text" as const, text: `Unknown query type: ${query}` }],
            };
        }
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
