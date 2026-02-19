import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getStandardsBreakdown,
  getStudentsByStandard,
  getReportingCategoriesWithStandards,
} from "../../lib/queries.js";

export function registerStandardsTools(server: McpServer) {
  // ── get_standards_breakdown ──────────────────────────────────────────────
  server.tool(
    "get_standards_breakdown",
    "Get class-wide performance on every standard, grouped by reporting category. Shows average scores, below-proficiency counts and percentages, and per-level breakdowns. Proficiency threshold = 5470.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID"),
    },
    async ({ rosterId, testId }) => {
      const result = getStandardsBreakdown(rosterId, testId);

      let text = "## Standards Performance Breakdown\n\n";
      text += "Proficiency threshold: 5470\n\n";

      for (const cat of result.categories) {
        text += `### ${cat.rcName}\n\n`;

        // Sort standards by below-proficiency percentage (worst first)
        const sorted = [...cat.standards].sort(
          (a, b) => b.belowProficiencyPct - a.belowProficiencyPct
        );

        for (const std of sorted) {
          const alert = std.belowProficiencyPct > 50 ? " 🚨" : std.belowProficiencyPct > 30 ? " ⚠️" : "";
          text += `• **${std.code}**${alert}: avg ${std.overallAvg} — ${std.belowProficiencyCount}/${std.totalCount} below proficiency (${std.belowProficiencyPct}%)\n`;
          text += `  ${std.description.substring(0, 80)}${std.description.length > 80 ? "..." : ""}\n`;

          const levelNames: Record<number, string> = { 1: "Beg", 2: "App", 3: "Und", 4: "Adv" };
          const byLevelStr = std.byLevel
            .map((bl) => `${levelNames[bl.level] ?? `L${bl.level}`}: ${bl.avgScore} (n=${bl.count})`)
            .join(", ");
          if (byLevelStr) text += `  By level: ${byLevelStr}\n`;
          text += "\n";
        }
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ── get_students_by_standard ─────────────────────────────────────────────
  server.tool(
    "get_students_by_standard",
    "List all students and their score on a specific standard, sorted from lowest to highest. Shows whether each student is proficient and whether they have an existing assignment targeting this standard.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID"),
      standardId: z.number().describe("The standard ID"),
    },
    async ({ rosterId, testId, standardId }) => {
      try {
        const result = getStudentsByStandard(rosterId, testId, standardId);

        const levelNames: Record<number, string> = {
          1: "Beginning",
          2: "Approaching",
          3: "Understands",
          4: "Advanced",
        };

        let text = `## Students for Standard: ${result.standard.code}\n`;
        text += `${result.standard.description}\n`;
        text += `RC: ${result.standard.rcName}\n\n`;

        const belowCount = result.students.filter((s) => !s.isProficient).length;
        text += `${belowCount}/${result.students.length} students below proficiency (5470)\n\n`;

        for (const s of result.students) {
          const profIcon = s.isProficient ? "✅" : "❌";
          const assignIcon = s.hasAssignment ? " 📋" : "";
          text += `${profIcon} ${s.name} (ID: ${s.id}) — Std score: ${s.standardScore} — Overall: ${s.overallScore} (${levelNames[s.overallLevel] ?? `Level ${s.overallLevel}`})${assignIcon}\n`;
        }

        text += "\n📋 = has existing assignment for this standard";

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // ── list_reporting_categories ────────────────────────────────────────────
  server.tool(
    "list_reporting_categories",
    "List all reporting categories with their full standards hierarchy (domains, sub-domains, individual standards with codes and descriptions).",
    {},
    async () => {
      const categories = getReportingCategoriesWithStandards();

      let text = "## Reporting Categories & Standards\n\n";

      for (const rc of categories) {
        text += `### ${rc.name} (RC ID: ${rc.id})\n`;

        for (const domain of rc.domains) {
          text += `\n**${domain.name}**\n`;
          for (const sub of domain.subDomains) {
            if (sub.name) text += `  *${sub.name}*\n`;
            for (const std of sub.standards) {
              text += `  • ${std.code} (ID: ${std.id}): ${std.description}\n`;
            }
          }
        }
        text += "\n";
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
