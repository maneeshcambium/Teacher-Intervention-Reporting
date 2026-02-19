# Phase 10 Prompt: MCP Server & Smart Query Panel — Natural Language Data Access

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–9 complete.
> **Stack**: Next.js 14 App Router, TypeScript, `@modelcontextprotocol/sdk`, better-sqlite3, shadcn/ui.

---

## Problem

Teachers aren't data analysts. The dashboard provides charts and tables, but sometimes a teacher just wants to ask a question:

- *"Which students performed worst despite completing an assignment?"*
- *"Show me the bottom 5 students in Number & Operations"*
- *"What assignment had the biggest positive impact?"*
- *"Which standards are my class weakest on?"*
- *"List students who dropped a performance level between PM1 and PM2"*

Currently, answering these questions requires navigating multiple tabs, applying filters, and mentally cross-referencing data.

**This phase delivers two complementary solutions:**

1. **MCP Server** (standalone process) — Exposes all dashboard data as **tools** that any MCP-compatible AI assistant (Claude Desktop, VS Code Copilot) can call, enabling free-form natural language queries.
2. **Smart Query Panel** (in-app slide-over) — A no-LLM UI with **9 predefined query cards** that teachers can click to get instant analytical answers directly in the dashboard.

## Design Decision: Standalone MCP Server (Not Embedded in Next.js)

The MCP server runs as a **separate process** alongside the Next.js app:

1. **Protocol compliance** — MCP servers communicate over stdio or SSE, not HTTP request/response. A standalone server cleanly implements the MCP transport.
2. **Reusable** — Any MCP-compatible client (Claude Desktop, VS Code Copilot, custom chat UI) can connect without modifications.
3. **Shared database** — The MCP server imports the same `lib/db.ts` and `lib/queries.ts` modules, ensuring data consistency with zero duplication.
4. **No Next.js coupling** — The server can start/stop independently. Teachers can use the dashboard UI *and* the AI assistant simultaneously.

**Entry point**: `src/mcp/server.ts` — run via `npx tsx src/mcp/server.ts` or add an npm script `"mcp": "tsx src/mcp/server.ts"`.

---

## 1. Dependencies

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D tsx
```

- `@modelcontextprotocol/sdk` — Official MCP SDK for building servers.
- `zod` — Schema validation for tool parameters (required by MCP SDK).
- `tsx` — TypeScript execution for the standalone server process.

---

## 2. Folder Structure

```
src/
├── mcp/
│   ├── server.ts                # MCP server entry point
│   └── tools/
│       ├── roster-tools.ts      # Roster & student listing tools
│       ├── performance-tools.ts # Performance & score query tools
│       ├── assignment-tools.ts  # Assignment management tools
│       ├── impact-tools.ts      # DiD impact analysis tools
│       ├── standards-tools.ts   # Standards analysis tools
│       └── analytics-tools.ts   # Natural language query tool
├── app/
│   └── api/
│       └── ask/
│           └── route.ts         # In-app Smart Query Panel API (POST)
├── components/
│   ├── AskPanel.tsx             # Slide-over query panel (Sheet)
│   └── AskButton.tsx            # Floating trigger button
└── hooks/
    └── useAsk.ts                # TanStack Query hook for /api/ask
```

---

## 3. MCP Server Entry Point

### `src/mcp/server.ts`

```typescript
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

// Register all 6 tool groups (17 tools total)
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
```

---

## 4. Tool Definitions

Each tool maps to one or more existing query functions. Tools accept simple parameters and return formatted text responses suitable for an AI to relay to the teacher.

**6 tool groups, 17 tools total:**

| Group | File | Tools |
|-------|------|-------|
| Roster | `roster-tools.ts` | `list_rosters`, `list_students`, `get_student_detail` |
| Performance | `performance-tools.ts` | `get_performance_distribution`, `get_rc_breakdown`, `get_performance_levels`, `list_test_groups`, `list_tests` |
| Assignment | `assignment-tools.ts` | `list_assignments`, `get_student_assignments`, `create_assignment`, `delete_assignment` |
| Impact | `impact-tools.ts` | `get_assignment_impact`, `get_all_impacts`, `get_standard_level_impact` |
| Standards | `standards-tools.ts` | `get_standards_breakdown`, `get_students_by_standard`, `list_reporting_categories` |
| Analytics | `analytics-tools.ts` | `query_students_natural` |

### 4a. Roster Tools (`src/mcp/tools/roster-tools.ts`)

#### `list_rosters`
- **Description**: List all class rosters.
- **Parameters**: None.
- **Calls**: `db.select().from(rosters).all()`
- **Returns**: Table of roster IDs and names.

#### `list_students`
- **Description**: List students in a roster with their latest test scores. Supports filtering by performance level, searching by name, and sorting.
- **Parameters**:
  - `rosterId` (number, required)
  - `testId` (number, required)
  - `level` (number, optional) — Filter to specific performance level (1–4).
  - `search` (string, optional) — Name search.
  - `sort` (string, optional) — Sort field: `name`, `level`, `overallScore`.
  - `order` (string, optional) — `asc` or `desc`.
- **Calls**: `getStudentList(rosterId, testId, filters)`
- **Returns**: Formatted student list with scores and performance levels.

#### `get_student_detail`
- **Description**: Get comprehensive detail for a single student: all test scores across PM windows, RC scores, standard scores.
- **Parameters**: `studentId` (number, required)
- **Calls**: `getStudentDetail(studentId)`
- **Returns**: Student profile with score history.

---

### 4b. Performance Tools (`src/mcp/tools/performance-tools.ts`)

#### `get_performance_distribution`
- **Description**: Get the count and percentage of students at each performance level (Beginning, Approaching, Understands, Advanced) for a roster on a specific test.
- **Parameters**: `rosterId` (number), `testId` (number)
- **Calls**: `getPerformanceDistribution(rosterId, testId)`
- **Returns**: Level breakdown with counts and percentages.

#### `get_rc_breakdown`
- **Description**: Get average Reporting Category scores broken down by performance level.
- **Parameters**: `rosterId` (number), `testId` (number)
- **Calls**: `getRCBreakdown(rosterId, testId)`
- **Returns**: RC averages per level.

#### `get_performance_levels`
- **Description**: List all performance level definitions with score ranges and colors.
- **Parameters**: None.
- **Calls**: `getPerformanceLevels()`

#### `list_test_groups`
- **Description**: List all test groups (e.g., "2024-25 Progress Monitoring").
- **Parameters**: None.

#### `list_tests`
- **Description**: List all tests in a test group with sequence and administration dates.
- **Parameters**: `groupId` (number)

---

### 4c. Assignment Tools (`src/mcp/tools/assignment-tools.ts`)

#### `list_assignments`
- **Description**: List all assignments in a test group with completion status breakdown.
- **Parameters**: `groupId` (number)
- **Calls**: `getAssignments(groupId)`
- **Returns**: Assignment list with platform, standards, and student progress.

#### `get_student_assignments`
- **Description**: Get all assignments for a specific student with their status.
- **Parameters**: `studentId` (number)
- **Calls**: `getStudentAssignments(studentId)`
- **Returns**: Assignment list with status and linked standards.

#### `create_assignment`
- **Description**: Create a new intervention assignment for selected students targeting specific standards.
- **Parameters**: `name`, `platform`, `rcId`, `groupId`, `createdAfterTestId`, `impactedTestId`, `standardIds[]`, `studentIds[]`
- **Calls**: `createAssignment(input)`

#### `delete_assignment`
- **Description**: Delete an assignment and all its student/standard links.
- **Parameters**: `assignmentId` (number)
- **Calls**: `deleteAssignment(id)`

---

### 4d. Impact Tools (`src/mcp/tools/impact-tools.ts`)

#### `get_assignment_impact`
- **Description**: Calculate the Difference-in-Differences (DiD) impact for a single assignment. Shows how much completing the assignment improved student scores compared to a control group.
- **Parameters**: `assignmentId` (number)
- **Calls**: `calculateAssignmentImpact(assignmentId, false)`
- **Returns**: Treated vs control deltas, DiD impact, p-value, significance.

#### `get_all_impacts`
- **Description**: Get DiD impact summary for all assignments in a test group. Useful for finding which assignments had the biggest effect.
- **Parameters**: `groupId` (number)
- **Calls**: `calculateAllImpacts(groupId)`
- **Returns**: Ranked list of assignments by impact.

#### `get_standard_level_impact`
- **Description**: Get per-standard DiD breakdown for an assignment. Shows which specific standards improved and which didn't.
- **Parameters**: `assignmentId` (number)
- **Calls**: `calculateStandardLevelImpact(assignmentId)`
- **Returns**: Per-standard DiD results.

---

### 4e. Standards Tools (`src/mcp/tools/standards-tools.ts`)

#### `get_standards_breakdown`
- **Description**: Get class-wide performance on every standard, grouped by reporting category. Shows average scores, below-proficiency counts, and per-level breakdowns.
- **Parameters**: `rosterId` (number), `testId` (number)
- **Calls**: `getStandardsBreakdown(rosterId, testId)`

#### `get_students_by_standard`
- **Description**: List all students and their score on a specific standard, sorted from lowest to highest. Shows whether each student has an existing assignment targeting this standard.
- **Parameters**: `rosterId` (number), `testId` (number), `standardId` (number)
- **Calls**: `getStudentsByStandard(rosterId, testId, standardId)`

#### `list_reporting_categories`
- **Description**: List all reporting categories with their standards hierarchy (domains, sub-domains, individual standards).
- **Parameters**: None.
- **Calls**: `getReportingCategoriesWithStandards()`

---

### 4f. Analytics Tools (`src/mcp/tools/analytics-tools.ts`)

#### `query_students_natural`
- **Description**: Run common analytical queries about student performance. A higher-level tool that runs pre-built analytical queries teachers commonly ask, avoiding the need to chain multiple tool calls.
- **Parameters**:
  - `query` (enum, required) — One of: `worst_despite_completing`, `biggest_score_drops`, `biggest_score_gains`, `level_changes`, `unassigned_struggling`, `assignment_completion_rates`.
  - `rosterId` (number, required)
  - `testId1` (number, required) — First/primary test ID.
  - `testId2` (number, optional) — Second test ID (required for comparison queries like drops/gains/level_changes).
  - `limit` (number, optional, default 10) — Max results.
- **Calls**: Raw SQL via `sqlite` for complex cross-table joins.
- **Returns**: Formatted text with student names, scores, deltas, and contextual labels.

---

## 5. Tool Implementation Pattern

Each tool follows the same pattern:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStudentList } from "@/lib/queries";

export function registerRosterTools(server: McpServer) {
  server.tool(
    "list_students",
    "List students in a roster with scores. Supports filtering by level, name search, sorting.",
    {
      rosterId: z.number().describe("The roster ID"),
      testId: z.number().describe("The test ID to show scores for"),
      level: z.number().min(1).max(4).optional().describe("Filter by performance level (1-4)"),
      search: z.string().optional().describe("Search students by name"),
      sort: z.enum(["name", "level", "overallScore"]).optional().describe("Sort field"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    },
    async ({ rosterId, testId, level, search, sort, order }) => {
      const result = getStudentList(rosterId, testId, { level, search, sort, order });

      const lines = result.students.map(
        (s) => `• ${s.name} — Level ${s.level} — Score: ${s.overallScore} — ${s.assignmentCount} assignments`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${result.total} students:\n\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );
}
```

### Response Formatting Guidelines

- Return **plain text** formatted for readability. The AI client will present it conversationally.
- Use bullet points for lists, tables for comparisons.
- Include relevant context (e.g., "Level 1 = Beginning, below 5410").
- Round scores to integers.
- For impact results, always include the p-value interpretation: `"p = 0.023 (statistically significant)"` or `"p = 0.340 (not significant)"`.

---

## 6. npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "mcp": "tsx src/mcp/server.ts"
  }
}
```

---

## 7. MCP Client Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "teacher-dashboard": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/TeacherAssignments"
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "teacher-dashboard": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

---

## 8. Example Natural Language Queries → Tool Calls

| Teacher asks... | MCP tool(s) called |
|---|---|
| "Which students performed worst despite completing an assignment?" | `list_assignments` → `get_student_detail` for completed students, compare post-scores |
| "What's my class performance breakdown?" | `get_performance_distribution` |
| "Show weakest standards" | `get_standards_breakdown` → sort by `belowProficiencyPct` |
| "Which assignment helped the most?" | `get_all_impacts` → sort by `didImpact` |
| "Who needs help with fractions?" | `get_students_by_standard` for fraction standards |
| "Did the IXL assignment actually work?" | `get_assignment_impact` for the IXL assignment |
| "Compare PM1 vs PM2 for my class" | `get_performance_distribution` for both tests |
| "Which standards got worse despite the assignment?" | `get_standard_level_impact` → filter negative `didImpact` |
| "Create an assignment for Level 1 students on 3.NF.A.1" | `list_students` (level=1) → `create_assignment` |
| "Show me student John's complete profile" | `list_students` (search="John") → `get_student_detail` |

---

## 9. Advanced: Natural Language Query Tool

### `query_students_natural`

A higher-level tool that runs pre-built analytical queries teachers commonly ask. This avoids requiring the AI to chain multiple tool calls for common patterns.

```typescript
server.tool(
  "query_students_natural",
  "Run common analytical queries about student performance. Supports queries like: worst performers with completed assignments, biggest score drops, students needing intervention, etc.",
  {
    query: z.enum([
      "worst_despite_completing",      // Students who completed assignments but still score low
      "biggest_score_drops",           // Students whose scores decreased between tests
      "biggest_score_gains",           // Students whose scores increased the most
      "level_changes",                 // Students who changed performance levels between tests
      "unassigned_struggling",         // Low-performing students with no assignments
      "assignment_completion_rates",   // How well students are completing assignments
    ]).describe("The type of analytical query to run"),
    rosterId: z.number().describe("Roster ID"),
    testId1: z.number().describe("First test ID (earlier/pre)"),
    testId2: z.number().optional().describe("Second test ID (later/post) — required for comparison queries"),
    limit: z.number().optional().default(10).describe("Max results to return"),
  },
  async ({ query, rosterId, testId1, testId2, limit }) => {
    // Implementation delegates to raw SQL for complex cross-cutting queries
    // that don't map cleanly to a single existing function.
    // See Section 10 for implementation.
  }
);
```

---

## 10. Implementation: `query_students_natural` Queries

These queries use raw SQL via the `sqlite` instance for complex joins that cross multiple tables.

### `worst_despite_completing`

```sql
SELECT s.id, s.name, sc.overall_score, sc.level,
       GROUP_CONCAT(a.name) as completedAssignments
FROM students s
JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?  -- testId (post)
JOIN assignment_students asn ON asn.student_id = s.id AND asn.status = 'completed'
JOIN assignments a ON a.id = asn.assignment_id
WHERE s.roster_id = ?
GROUP BY s.id
ORDER BY sc.overall_score ASC
LIMIT ?
```

### `biggest_score_drops`

```sql
SELECT s.id, s.name,
       sc1.overall_score as preScore, sc1.level as preLevel,
       sc2.overall_score as postScore, sc2.level as postLevel,
       (sc2.overall_score - sc1.overall_score) as delta
FROM students s
JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = ?  -- testId1
JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = ?  -- testId2
WHERE s.roster_id = ?
ORDER BY delta ASC
LIMIT ?
```

### `biggest_score_gains`

Same as above but `ORDER BY delta DESC`.

### `level_changes`

```sql
SELECT s.id, s.name,
       sc1.level as preLevel, sc2.level as postLevel,
       (sc2.level - sc1.level) as levelChange,
       sc1.overall_score as preScore, sc2.overall_score as postScore
FROM students s
JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = ?
JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = ?
WHERE s.roster_id = ? AND sc1.level != sc2.level
ORDER BY levelChange ASC
```

### `unassigned_struggling`

```sql
SELECT s.id, s.name, sc.overall_score, sc.level
FROM students s
JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
WHERE s.roster_id = ?
  AND sc.level <= 2
  AND s.id NOT IN (SELECT student_id FROM assignment_students)
ORDER BY sc.overall_score ASC
LIMIT ?
```

### `assignment_completion_rates`

```sql
SELECT s.id, s.name,
       COUNT(asn.assignment_id) as totalAssignments,
       SUM(CASE WHEN asn.status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN asn.status = 'started' THEN 1 ELSE 0 END) as started,
       SUM(CASE WHEN asn.status = 'not_started' THEN 1 ELSE 0 END) as notStarted,
       sc.overall_score, sc.level
FROM students s
JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
JOIN assignment_students asn ON asn.student_id = s.id
WHERE s.roster_id = ?
GROUP BY s.id
ORDER BY completed * 1.0 / COUNT(asn.assignment_id) ASC
LIMIT ?
```

---

## 11. Testing Checklist

### MCP Server (via MCP client)

- [ ] `list_rosters` returns all rosters
- [ ] `list_students` with level filter returns only matching students
- [ ] `get_student_detail` returns complete score history
- [ ] `get_performance_distribution` returns correct level counts
- [ ] `get_rc_breakdown` returns RC averages per level
- [ ] `list_assignments` returns assignments with status counts
- [ ] `get_assignment_impact` returns DiD results with p-values
- [ ] `get_all_impacts` returns ranked impact list
- [ ] `get_standard_level_impact` returns per-standard DiD
- [ ] `get_standards_breakdown` returns all standards with below-proficiency counts
- [ ] `get_students_by_standard` returns sorted student list
- [ ] `query_students_natural("worst_despite_completing")` returns correct students
- [ ] `query_students_natural("biggest_score_drops")` returns students with score decreases
- [ ] `create_assignment` successfully creates an assignment
- [ ] `delete_assignment` removes an assignment cleanly

### In-App Smart Query Panel

- [ ] Floating sparkle button visible on all pages (bottom-right)
- [ ] Clicking button opens slide-over panel from right
- [ ] 9 query cards render with correct icons and colors
- [ ] Single-test queries execute with current roster/test context
- [ ] Two-test queries show compare-test dropdown before executing
- [ ] Results render with formatted text (bold, bullets, numbered lists)
- [ ] Chat history accumulates multiple queries in a session
- [ ] "Clear" button resets message history
- [ ] Panel scrolls to latest result automatically
- [ ] `POST /api/ask` returns correct results for all 10 query types

---

## 12. In-App Smart Query Panel

In addition to the MCP server (for AI assistants), the dashboard includes a **Smart Query Panel** — a slide-over UI that lets teachers run predefined analytical queries directly in the browser without an LLM.

### Design Decision: No LLM, Predefined Query Cards

Instead of a free-text chatbot requiring an LLM, the panel offers **9 clickable query cards** that map to server-side query handlers. This keeps the POC simple, fast, and dependency-free.

### Components

#### `/api/ask` Route (`src/app/api/ask/route.ts`)

POST endpoint that accepts a query type + context parameters and returns a formatted text answer.

**Supported query types (10 total):**

| Query Type | Description | Needs 2nd Test |
|---|---|---|
| `worst_despite_completing` | Students who completed assignments but still score lowest | No |
| `biggest_score_drops` | Students whose scores decreased between two tests | Yes |
| `biggest_score_gains` | Students whose scores increased the most | Yes |
| `level_changes` | Students who changed performance levels | Yes |
| `unassigned_struggling` | Low-performing (L1–2) students with no assignments | No |
| `assignment_completion_rates` | Completion rates ranked by least complete | No |
| `performance_distribution` | Count/percentage at each performance level | No |
| `weakest_standards` | Standards with highest % below proficiency | No |
| `best_assignment_impact` | Assignments ranked by DiD impact | No |
| `students_by_standard` | Students sorted by score on a specific standard | No |

The route reuses the same raw SQL queries from the MCP analytics tools plus existing `lib/queries.ts` and `lib/impact.ts` functions.

#### `AskPanel` (`src/components/AskPanel.tsx`)

- **Sheet** (shadcn/ui) slide-over from the right side.
- **9 query cards** with icons, color-coded by category (red for risks, green for gains, etc.).
- **Chat-style message history** — each query shows the question label and formatted response.
- **Compare-test selector** — for queries needing two tests (drops, gains, level changes), a dropdown appears to pick the second test.
- **Markdown-lite renderer** — renders bold text, bullet points, numbered lists, and horizontal rules from the API response.
- Auto-scrolls to the latest result.

#### `AskButton` (`src/components/AskButton.tsx`)

- **Floating action button** — fixed bottom-right corner, blue circle with sparkle icon.
- Toggles the `AskPanel` sheet open/closed.
- Rendered in `src/app/layout.tsx` (root layout) so it's available on every page.

#### `useAsk` Hook (`src/hooks/useAsk.ts`)

- TanStack Query `useMutation` wrapping `POST /api/ask`.
- Maintains a `messages` array (chat history) with `{ id, role, content, timestamp }`.
- Exposes `ask(params)`, `clearMessages()`, and `isLoading`.
- User messages show the query card label; assistant messages show the formatted answer.

### Integration

Added `<AskButton />` to `src/app/layout.tsx` between `</main>` and `<Toaster />`, making it globally accessible across all dashboard pages.

---

## 13. What NOT to Do

- Do not duplicate query logic — import from `lib/queries.ts` and `lib/impact.ts`.
- Do not add HTTP endpoints for MCP — use stdio transport.
- Do not embed the MCP server inside the Next.js process — it runs separately.
- Do not add authentication to the MCP server — this is a local-only POC.
- Do not return raw JSON — format responses as human-readable text.
- Do not add an LLM dependency for the in-app query panel — it uses predefined query types.
