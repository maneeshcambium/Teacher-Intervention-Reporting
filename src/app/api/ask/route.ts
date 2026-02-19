import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import {
  getPerformanceDistribution,
  getRCBreakdown,
  getStandardsBreakdown,
  getStudentsByStandard,
  getAssignments,
} from "@/lib/queries";
import {
  calculateAllImpacts,
  calculateAssignmentImpact,
} from "@/lib/impact";

// ─── Query type definitions ────────────────────────────────────────────────

type QueryType =
  | "worst_despite_completing"
  | "biggest_score_drops"
  | "biggest_score_gains"
  | "level_changes"
  | "unassigned_struggling"
  | "assignment_completion_rates"
  | "performance_distribution"
  | "weakest_standards"
  | "best_assignment_impact"
  | "students_by_standard";

interface AskRequest {
  query: QueryType;
  rosterId: number;
  testId: number;
  testId2?: number;
  standardId?: number;
  limit?: number;
}

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginning",
  2: "Approaching",
  3: "Understands",
  4: "Advanced",
};

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskRequest;
    const { query, rosterId, testId, testId2, standardId, limit = 10 } = body;

    if (!query || !rosterId || !testId) {
      return NextResponse.json(
        { error: "query, rosterId, and testId are required" },
        { status: 400 }
      );
    }

    let answer: string;

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
          .all(testId, rosterId, limit) as Array<{
          id: number;
          name: string;
          overallScore: number;
          level: number;
          completedAssignments: string;
          completedCount: number;
        }>;

        if (rows.length === 0) {
          answer =
            "No students found who have completed assignments. Try running 'Simulate Sync' first to mark some assignments as completed.";
        } else {
          const lines = rows.map(
            (r) =>
              `• **${r.name}** — Score: ${r.overallScore} (${LEVEL_NAMES[r.level]}) — Completed ${r.completedCount} assignment(s): ${r.completedAssignments}`
          );
          answer = `**Students who performed worst despite completing assignments:**\n\n${lines.join("\n")}`;
        }
        break;
      }

      case "biggest_score_drops": {
        if (!testId2) {
          answer = "Please select a second test to compare against.";
          break;
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
          .all(testId, testId2, rosterId, limit) as Array<{
          id: number;
          name: string;
          preScore: number;
          preLevel: number;
          postScore: number;
          postLevel: number;
          delta: number;
        }>;

        if (rows.length === 0) {
          answer = "No score data found for the selected tests.";
        } else {
          const lines = rows.map((r) => {
            const lvlChange =
              r.preLevel !== r.postLevel
                ? ` (${LEVEL_NAMES[r.preLevel]} → ${LEVEL_NAMES[r.postLevel]})`
                : "";
            return `• **${r.name}** — ${r.preScore} → ${r.postScore} (${r.delta >= 0 ? "+" : ""}${r.delta} pts)${lvlChange}`;
          });
          answer = `**Biggest score drops:**\n\n${lines.join("\n")}`;
        }
        break;
      }

      case "biggest_score_gains": {
        if (!testId2) {
          answer = "Please select a second test to compare against.";
          break;
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
          .all(testId, testId2, rosterId, limit) as Array<{
          id: number;
          name: string;
          preScore: number;
          preLevel: number;
          postScore: number;
          postLevel: number;
          delta: number;
        }>;

        if (rows.length === 0) {
          answer = "No score data found for the selected tests.";
        } else {
          const lines = rows.map((r) => {
            const lvlChange =
              r.preLevel !== r.postLevel
                ? ` (${LEVEL_NAMES[r.preLevel]} → ${LEVEL_NAMES[r.postLevel]})`
                : "";
            return `• **${r.name}** — ${r.preScore} → ${r.postScore} (+${r.delta} pts)${lvlChange}`;
          });
          answer = `**Biggest score gains:**\n\n${lines.join("\n")}`;
        }
        break;
      }

      case "level_changes": {
        if (!testId2) {
          answer = "Please select a second test to compare against.";
          break;
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
          .all(testId, testId2, rosterId) as Array<{
          id: number;
          name: string;
          preLevel: number;
          postLevel: number;
          levelChange: number;
          preScore: number;
          postScore: number;
        }>;

        if (rows.length === 0) {
          answer = "No students changed performance levels between these tests.";
        } else {
          const dropped = rows.filter((r) => r.levelChange < 0);
          const improved = rows.filter((r) => r.levelChange > 0);
          let text = "**Performance level changes:**\n\n";
          if (dropped.length > 0) {
            text += `⬇️ **Dropped** (${dropped.length}):\n`;
            text += dropped
              .map(
                (r) =>
                  `• **${r.name}** — ${LEVEL_NAMES[r.preLevel]} → ${LEVEL_NAMES[r.postLevel]} (${r.preScore} → ${r.postScore})`
              )
              .join("\n");
            text += "\n\n";
          }
          if (improved.length > 0) {
            text += `⬆️ **Improved** (${improved.length}):\n`;
            text += improved
              .map(
                (r) =>
                  `• **${r.name}** — ${LEVEL_NAMES[r.preLevel]} → ${LEVEL_NAMES[r.postLevel]} (${r.preScore} → ${r.postScore})`
              )
              .join("\n");
          }
          answer = text;
        }
        break;
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
          .all(testId, rosterId, limit) as Array<{
          id: number;
          name: string;
          overallScore: number;
          level: number;
        }>;

        if (rows.length === 0) {
          answer =
            "All struggling students (Level 1–2) already have assignments. Great job! 🎉";
        } else {
          const lines = rows.map(
            (r) =>
              `• **${r.name}** — Score: ${r.overallScore} (${LEVEL_NAMES[r.level]})`
          );
          answer = `**Struggling students without any assignments** (Level 1–2):\n\n${lines.join("\n")}\n\n_Consider creating targeted intervention assignments for these students._`;
        }
        break;
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
          .all(testId, rosterId, limit) as Array<{
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
          answer = "No students with assignments found.";
        } else {
          const lines = rows.map((r) => {
            const pct =
              r.totalAssignments > 0
                ? Math.round((r.completed / r.totalAssignments) * 100)
                : 0;
            return `• **${r.name}** — ${pct}% complete (${r.completed}/${r.totalAssignments}) — ${r.started} in progress, ${r.notStarted} not started — Score: ${r.overallScore} (${LEVEL_NAMES[r.level]})`;
          });
          answer = `**Assignment completion rates** (lowest first):\n\n${lines.join("\n")}`;
        }
        break;
      }

      case "performance_distribution": {
        const result = getPerformanceDistribution(rosterId, testId);
        const lines = result.levels.map(
          (l) =>
            `• **${l.name}** (Level ${l.level}): ${l.count} students (${l.percentage}%)`
        );
        answer = `**Performance distribution** (${result.total} students):\n\n${lines.join("\n")}`;
        break;
      }

      case "weakest_standards": {
        const result = getStandardsBreakdown(rosterId, testId);
        const allStandards = result.categories.flatMap((c) =>
          c.standards.map((s) => ({ ...s, rcName: c.rcName }))
        );
        allStandards.sort(
          (a, b) => b.belowProficiencyPct - a.belowProficiencyPct
        );
        const top = allStandards.slice(0, limit);
        const lines = top.map(
          (s) =>
            `• **${s.code}** (${s.rcName}) — ${s.belowProficiencyPct}% below proficiency (${s.belowProficiencyCount}/${s.totalCount}) — Avg: ${s.overallAvg}`
        );
        answer = `**Weakest standards** (highest % below proficiency):\n\n${lines.join("\n")}`;
        break;
      }

      case "best_assignment_impact": {
        // Need test group — infer from testId
        const testRow = sqlite
          .prepare(`SELECT group_id FROM tests WHERE id = ?`)
          .get(testId) as { group_id: number } | undefined;

        if (!testRow) {
          answer = "Could not find test group for the selected test.";
          break;
        }

        const impacts = calculateAllImpacts(testRow.group_id);
        if (impacts.length === 0) {
          answer =
            "No impact data available. Ensure assignments exist with a post-test and completed students.";
          break;
        }

        const top = impacts.slice(0, limit);
        const lines = top.map((imp, i) => {
          const sign = imp.didImpact >= 0 ? "+" : "";
          const sig = imp.isSignificant ? " ✓" : "";
          return `${i + 1}. **${imp.assignmentName}** (${imp.platform}) — DiD: ${sign}${imp.didImpact} pts${sig} — Treated: ${imp.treatedCount}, Control: ${imp.controlCount}`;
        });
        answer = `**Assignment impact ranking** (by DiD effect):\n\n${lines.join("\n")}\n\n_✓ = statistically significant (p < 0.05)_`;
        break;
      }

      case "students_by_standard": {
        if (!standardId) {
          answer = "Please select a standard to see student scores.";
          break;
        }
        const result = getStudentsByStandard(rosterId, testId, standardId);
        const belowCount = result.students.filter((s) => !s.isProficient).length;
        const lines = result.students.slice(0, limit).map((s) => {
          const icon = s.isProficient ? "✅" : "❌";
          const assign = s.hasAssignment ? " 📋" : "";
          return `${icon} **${s.name}** — Std: ${s.standardScore} — Overall: ${s.overallScore} (${LEVEL_NAMES[s.overallLevel]})${assign}`;
        });
        answer = `**${result.standard.code}: ${result.standard.description}**\n${belowCount}/${result.students.length} below proficiency\n\n${lines.join("\n")}\n\n_📋 = has assignment for this standard_`;
        break;
      }

      default:
        answer = `Unknown query type: "${query}"`;
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Ask API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
