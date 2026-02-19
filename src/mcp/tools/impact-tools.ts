import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  calculateAssignmentImpact,
  calculateAllImpacts,
  calculateStandardLevelImpact,
} from "../../lib/impact.js";

export function registerImpactTools(server: McpServer) {
  // ── get_assignment_impact ────────────────────────────────────────────────
  server.tool(
    "get_assignment_impact",
    "Calculate the Difference-in-Differences (DiD) impact for a single assignment. Compares score gains of students who completed the assignment (treated) vs students not assigned (control). A positive DiD means the assignment helped; p < 0.05 means the result is statistically significant.",
    {
      assignmentId: z.number().describe("The assignment ID"),
    },
    async ({ assignmentId }) => {
      const impact = calculateAssignmentImpact(assignmentId, false);

      if (!impact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No impact data available for assignment ${assignmentId}. The assignment may not exist, have no linked standards, or no post-test.`,
            },
          ],
        };
      }

      const sigText = impact.pValue != null
        ? `p = ${impact.pValue} (${impact.isSignificant ? "statistically significant" : "not significant"})`
        : "p-value unavailable (insufficient sample size)";

      const text = [
        `## DiD Impact: ${impact.assignmentName}`,
        `Platform: ${impact.platform} | RC: ${impact.rcName}`,
        `Standards: ${impact.standards.join(", ")}`,
        `Window: ${impact.preTestName} → ${impact.postTestName}`,
        "",
        "### Treated Group (completed assignment)",
        `  ${impact.treatedCount} students`,
        `  Pre-test avg: ${impact.treatedPreAvg} → Post-test avg: ${impact.treatedPostAvg}`,
        `  Change: ${impact.treatedDelta >= 0 ? "+" : ""}${impact.treatedDelta} pts`,
        "",
        "### Control Group (not assigned)",
        `  ${impact.controlCount} students`,
        `  Pre-test avg: ${impact.controlPreAvg} → Post-test avg: ${impact.controlPostAvg}`,
        `  Change: ${impact.controlDelta >= 0 ? "+" : ""}${impact.controlDelta} pts`,
        "",
        "### Difference-in-Differences",
        `  **DiD Impact: ${impact.didImpact >= 0 ? "+" : ""}${impact.didImpact} pts** (${impact.didImpactPercent >= 0 ? "+" : ""}${impact.didImpactPercent}%)`,
        `  ${sigText}`,
        "",
        impact.didImpact > 0
          ? "Interpretation: The assignment had a POSITIVE effect — treated students improved more than the control group."
          : impact.didImpact < 0
            ? "Interpretation: The assignment had a NEGATIVE effect — treated students improved less than the control group."
            : "Interpretation: The assignment had NO measurable effect.",
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ── get_all_impacts ──────────────────────────────────────────────────────
  server.tool(
    "get_all_impacts",
    "Get DiD impact summary for ALL assignments in a test group, ranked from highest to lowest impact. Useful for answering 'which assignment helped the most?'",
    {
      groupId: z.number().describe("The test group ID"),
    },
    async ({ groupId }) => {
      const impacts = calculateAllImpacts(groupId);

      if (impacts.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No impact data available for test group ${groupId}. Ensure assignments exist and have post-tests.`,
            },
          ],
        };
      }

      const lines = impacts.map((imp, i) => {
        const sigMark = imp.isSignificant ? " ✓ significant" : "";
        const sign = imp.didImpact >= 0 ? "+" : "";
        return `${i + 1}. **${imp.assignmentName}** (${imp.platform}) — DiD: ${sign}${imp.didImpact} pts (${sign}${imp.didImpactPercent}%)${sigMark} — Treated: ${imp.treatedCount}, Control: ${imp.controlCount}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Impact Summary for ${impacts.length} assignment(s) (ranked by DiD impact):\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );

  // ── get_standard_level_impact ────────────────────────────────────────────
  server.tool(
    "get_standard_level_impact",
    "Get per-standard DiD breakdown for an assignment. Shows which specific standards improved and which didn't, helping teachers identify where re-intervention is needed.",
    {
      assignmentId: z.number().describe("The assignment ID"),
    },
    async ({ assignmentId }) => {
      const result = calculateStandardLevelImpact(assignmentId);

      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No standard-level impact data available for assignment ${assignmentId}.`,
            },
          ],
        };
      }

      let text = `## Standard-Level Impact: ${result.assignmentName}\n`;
      text += `Platform: ${result.platform} | RC: ${result.rcName}\n`;
      text += `Window: ${result.preTestName} → ${result.postTestName}\n`;
      text += `Overall DiD: ${result.overallDidImpact >= 0 ? "+" : ""}${result.overallDidImpact} pts\n\n`;
      text += `### Per-Standard Breakdown\n\n`;

      for (const std of result.standards) {
        const sign = std.didImpact >= 0 ? "+" : "";
        const sigText = std.pValue != null
          ? ` (p=${std.pValue}${std.isSignificant ? ", significant" : ""})`
          : "";
        const emoji = std.didImpact > 0 ? "📈" : std.didImpact < 0 ? "📉" : "➡️";

        text += `${emoji} **${std.code}**: ${sign}${std.didImpact} pts${sigText}\n`;
        text += `   ${std.description.substring(0, 80)}${std.description.length > 80 ? "..." : ""}\n`;
        text += `   Treated: ${std.treatedPreAvg}→${std.treatedPostAvg} (${sign}${std.treatedDelta}), Control: ${std.controlPreAvg}→${std.controlPostAvg} (${std.controlDelta >= 0 ? "+" : ""}${std.controlDelta})\n\n`;
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
