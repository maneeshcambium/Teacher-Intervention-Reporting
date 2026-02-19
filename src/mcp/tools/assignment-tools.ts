import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAssignments,
  getStudentAssignments,
  createAssignment,
  deleteAssignment,
} from "../../lib/queries.js";

export function registerAssignmentTools(server: McpServer) {
  // ── list_assignments ─────────────────────────────────────────────────────
  server.tool(
    "list_assignments",
    "List all intervention assignments in a test group with platform, targeted standards, and student completion status breakdown (not_started / started / completed).",
    {
      groupId: z.number().describe("The test group ID"),
    },
    async ({ groupId }) => {
      const assignments = getAssignments(groupId);

      if (assignments.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No assignments found in test group ${groupId}.`,
            },
          ],
        };
      }

      const lines = assignments.map((a) => {
        const completionPct =
          a.totalStudents > 0
            ? Math.round((a.completed / a.totalStudents) * 100)
            : 0;
        return [
          `• **${a.name}** (ID: ${a.id})`,
          `  Platform: ${a.platform} | RC: ${a.rcName}`,
          `  Standards: ${a.standards.join(", ") || "none"}`,
          `  Students: ${a.totalStudents} total — ${a.completed} completed, ${a.started} started, ${a.notStarted} not started (${completionPct}% complete)`,
          `  Created: ${a.createdAt}`,
        ].join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${assignments.length} assignment(s):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    }
  );

  // ── get_student_assignments ──────────────────────────────────────────────
  server.tool(
    "get_student_assignments",
    "Get all intervention assignments for a specific student, including status (not_started/started/completed), targeted standards, and pre/post test info.",
    {
      studentId: z.number().describe("The student ID"),
    },
    async ({ studentId }) => {
      const result = getStudentAssignments(studentId);

      if (result.assignments.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Student ${studentId} has no assignments.`,
            },
          ],
        };
      }

      const statusEmoji: Record<string, string> = {
        completed: "✅",
        started: "🔄",
        not_started: "⬜",
      };

      const lines = result.assignments.map((a) => {
        const emoji = statusEmoji[a.status] ?? "❓";
        const stds = a.standards.map((s) => s.code).join(", ");
        return [
          `${emoji} **${a.name}** (ID: ${a.assignmentId})`,
          `  Platform: ${a.platform} | Status: ${a.status}`,
          `  Standards: ${stds}`,
          `  Window: ${a.preTestName} → ${a.postTestName ?? "TBD"}`,
          a.completedAt ? `  Completed: ${a.completedAt}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Student ${studentId} has ${result.assignments.length} assignment(s):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    }
  );

  // ── create_assignment ────────────────────────────────────────────────────
  server.tool(
    "create_assignment",
    "Create a new intervention assignment for selected students targeting specific standards on an external platform (ixl, lexiacore5, reflex, khan_academy).",
    {
      name: z.string().describe("Assignment name"),
      platform: z
        .enum(["ixl", "lexiacore5", "reflex", "khan_academy"])
        .describe("External platform"),
      rcId: z.number().describe("Reporting category ID the assignment targets"),
      groupId: z.number().describe("Test group ID"),
      createdAfterTestId: z
        .number()
        .describe("The pre-test ID (test administered before assignment)"),
      impactedTestId: z
        .number()
        .describe("The post-test ID (test that will measure impact)"),
      standardIds: z
        .array(z.number())
        .describe("Array of standard IDs this assignment targets"),
      studentIds: z
        .array(z.number())
        .describe("Array of student IDs to assign"),
    },
    async (input) => {
      try {
        const result = createAssignment(input);
        return {
          content: [
            {
              type: "text" as const,
              text: `Assignment created successfully!\n\n• ID: ${result.id}\n• Name: ${result.name}\n• Platform: ${result.platform}\n• Standards: ${result.standardCount} linked\n• Students: ${result.studentCount} assigned\n• Created: ${result.createdAt}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create assignment: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // ── delete_assignment ────────────────────────────────────────────────────
  server.tool(
    "delete_assignment",
    "Delete an assignment and all its student/standard links. This cannot be undone.",
    {
      assignmentId: z.number().describe("The assignment ID to delete"),
    },
    async ({ assignmentId }) => {
      try {
        deleteAssignment(assignmentId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Assignment ${assignmentId} deleted successfully.`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to delete assignment: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
