# Teacher Intervention Dashboard — Product Requirements Document (PRD)

> **Version**: 1.0 | **Date**: 2026-02-18 | **Status**: Hackathon POC
> **Stack**: Next.js 14 (App Router) + TypeScript + SQLite (Drizzle ORM) + Recharts
> **Single deployable unit — optimized for Replit / Vercel**

---

## 1. Problem Statement

Teachers administer periodic **Progress Monitoring (PM)** tests to students. After reviewing PM1 results, they assign targeted practice on external platforms (IXL, Khan Academy, etc.) to struggling students. When PM2 results arrive, there is **no automated way** to measure whether those assignments actually improved student performance — and by how much.

### What This POC Proves

1. A single dashboard can track student performance across sequential tests (6 PM windows per year).
2. Statistical impact (Difference-in-Differences) of teacher-assigned interventions can be computed and visualized in real time.
3. The system can scale to 250 rosters (~8,750 students, ~52,500 score records) with sub-second query times using SQLite.

---

## 2. User Personas

| Persona | Goal | Primary Actions |
|---------|------|-----------------|
| **Teacher** | Monitor progress, assign practice, measure impact | View performance buckets → drill into RC/standards → create assignments → review impact after PM2 |
| **Student** | See scores + assigned tasks | View test scores by RC/standard, see assignment list and status |

---

## 3. Information Architecture & Page Map

```
/                         → Redirect to /dashboard
/dashboard                → Teacher Dashboard (default: auto-selected roster + test group)
/dashboard/students       → Student list (filterable by level, RC)
/dashboard/assignments    → Assignment list + create new
/dashboard/impact         → Impact analysis (DiD visualization)
/student/:id              → Individual Student View (scores + tasks)
/api/...                  → API routes (see Section 8)
```

---

## 4. Functional Requirements

### 4.1 Auto-Context on Load

- On first load, the system selects the **first roster** and the **first test group** as defaults.
- A top-bar context selector shows current `Roster` and `Test Group` with dropdowns to switch.
- Switching context reloads all dashboard data.

### 4.2 Teacher Dashboard (`/dashboard`)

#### 4.2.1 Class Overall Performance Panel

- **Title**: "Class Overall Performance" (matches real assessment dashboards).
- **Layout**: 4 performance level cards, each showing student count, percentage, and a colored left-border.
- **Performance Levels** (4 levels, not 5):
  - Level 1 — **Beginning to Understand** `#EF4444` (red): "Below Proficiency: Student demonstrates limited understanding of grade-level concepts and requires extensive support."
  - Level 2 — **Approaching Understanding** `#F97316` (orange): "Approaching Proficiency: Student demonstrates partial understanding and requires targeted support to reach proficiency."
  - Level 3 — **Understands** `#22C55E` (green): "At Proficiency: Student demonstrates adequate understanding of grade-level concepts and meets expectations."
  - Level 4 — **Advanced Understanding** `#3B82F6` (blue): "Above Proficiency: Student demonstrates thorough understanding and can apply knowledge in complex or novel situations."
- Each card shows student count + student icon, percentage badge, and a **"Skill Report for This Group >"** button.
- Clicking a performance level card **filters** the student list below to that level.
- Clicking the card again (or the Skill Report button) shows the detailed RC/standard breakdown for that group.
- **Scores use Scale Scores** (range ~5100–5800), not percentages.
- **Scale Score Thresholds**: L1 < 5410, L2 = 5410–5469, L3 = 5470–5529, L4 ≥ 5530.
- A **test selector** toggle (PM1 / PM2 / PM3 / PM4 / PM5 / PM6) switches which test's data is displayed.

#### 4.2.2 Reporting Category (RC) Breakdown Panel

- **Grouped bar chart**: For each RC, show the average score per performance level.
- Clicking an RC filters the student list to students who scored below proficiency in that RC.

#### 4.2.3 Student List Table

- Columns: `Name`, `Scale Score`, `Performance Level`, `RC1 Score`, `RC2 Score`, `RC3 Score`, `RC4 Score`, `Assignments (count)`, `Status`
- Sortable by any column.
- Filterable by: Level (from card click), RC (from RC click), or manual search.
- Checkbox selection for bulk assignment creation.
- No pagination needed (classes are ≤50 students). Show all students in a scrollable table.

#### 4.2.4 Assignment Summary Panel

- Table: `Assignment Name`, `Platform`, `Standards`, `Students Assigned`, `Not Started`, `Started`, `Completed`
- Button: **"+ New Assignment"** opens a slide-over form.

### 4.3 Assignment Creation (Slide-over Form)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | yes | e.g., "Fractions Practice Week 3" |
| Platform | select | yes | Options: IXL, LexiaCore5, Reflex, Khan Academy |
| Reporting Category | select | yes | Populated from test metadata |
| Domain | select | yes | Filtered by selected RC |
| Sub-Domain | select | no | Filtered by selected Domain |
| Standards | multi-select | yes | Filtered by RC/Domain/Sub-Domain |
| Students | pre-filled | yes | From checkbox selection on student list |
| Created After Test | auto | — | Current selected test (e.g., PM1) |
| Impacted Test | auto | — | Next sequential test (e.g., PM2) |

**On Submit**: Creates `assignments` row + `assignment_students` rows + `assignment_standards` rows.

### 4.4 Impact Analysis Page (`/dashboard/impact`)

#### 4.4.1 DiD Calculation

For each assignment:

```
Impact % = (Treated_PM2 - Treated_PM1) - (Control_PM2 - Control_PM1)
```

Where:
- **Treated** = students who completed the assignment
- **Control** = students NOT assigned (same level range in PM1)
- Scores are the **average of the aligned standard scores**

#### 4.4.2 Impact Visualization

- **Card per assignment** showing:
  - Assignment name + platform badge
  - Standards aligned (chips)
  - Impact % (large number, green if positive, red if negative)
  - Mini sparkline: Treated vs Control score trajectory
- **Scatter plot**: X = PM1 average (aligned standards), Y = PM2 average. Points colored by Treated/Control.

#### 4.4.3 Summary Statistics Table

| Column | Description |
|--------|-------------|
| Assignment | Name |
| N (Treated) | Count of completed students |
| N (Control) | Count of control students |
| Treated Δ | PM2 - PM1 average for treated |
| Control Δ | PM2 - PM1 average for control |
| **DiD (Impact %)** | Treated Δ - Control Δ |
| p-value | From two-sample t-test (optional, stretch) |

### 4.5 Student View (`/student/:id`)

- **Header**: Student name, roster, current overall level.
- **Score Cards**: One per test taken, showing overall score + level.
- **RC Breakdown Table**: RC name, score, level — per test.
- **Standard Scores Accordion**: Expandable per RC, shows each standard's score per test.
- **My Assignments Table**: Assignment name, platform, standards, status badge (Not Yet Started / Started / Completed).

### 4.6 External Sync API

- `POST /api/external/sync` — Simulates a callback from an external platform.
- **Request body**:
  ```json
  {
    "platform": "khan_academy",
    "student_external_id": "stu_123",
    "assignment_external_id": "assign_456",
    "status": "completed",
    "completed_at": "2026-02-18T10:00:00Z"
  }
  ```
- **Logic**: Looks up the student + assignment, updates `assignment_students.status` to `completed`.
- For the POC, a **"Simulate Sync"** button on the dashboard triggers this for random students.

---

## 5. Data Model (SQLite + Drizzle ORM)

### 5.1 Entity Relationship

```
rosters 1──M students
test_groups 1──M tests
students 1──M scores (per test)
assignments M──M standards (via assignment_standards)
assignments M──M students (via assignment_students)
assignments M──1 test_groups
assignments ──> created_after_test_id (FK tests)
assignments ──> impacted_test_id (FK tests)
```

### 5.2 Table Definitions

```sql
-- Rosters: teacher-managed groupings
CREATE TABLE rosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Students: belong to a roster
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roster_id INTEGER NOT NULL REFERENCES rosters(id),
  name TEXT NOT NULL,
  external_id TEXT, -- for external platform mapping
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_students_roster ON students(roster_id);

-- Test Groups: e.g., "Progress Monitoring"
CREATE TABLE test_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Tests: sequential within a group
CREATE TABLE tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES test_groups(id),
  sequence INTEGER NOT NULL,
  name TEXT NOT NULL,
  administered_at TEXT
);
CREATE INDEX idx_tests_group ON tests(group_id);

-- Performance Levels: metadata for the 4 performance classifications
CREATE TABLE performance_levels (
  id INTEGER PRIMARY KEY,        -- 1-4
  name TEXT NOT NULL,             -- e.g., "Beginning to Understand"
  label TEXT NOT NULL,            -- short label, e.g., "Beginning"
  description TEXT NOT NULL,      -- proficiency descriptor
  color TEXT NOT NULL,            -- hex color code
  min_score INTEGER NOT NULL,     -- inclusive lower bound (scale score)
  max_score INTEGER               -- exclusive upper bound (NULL for top level)
);

-- Reporting Categories: metadata for score breakdown
CREATE TABLE reporting_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT
);

-- Standards: granular learning objectives
CREATE TABLE standards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rc_id INTEGER NOT NULL REFERENCES reporting_categories(id),
  domain TEXT NOT NULL,
  sub_domain TEXT,
  code TEXT NOT NULL,        -- e.g., "3.NF.A.1"
  description TEXT NOT NULL
);
CREATE INDEX idx_standards_rc ON standards(rc_id);

-- Scores: one row per student per test
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  test_id INTEGER NOT NULL REFERENCES tests(id),
  overall_score INTEGER NOT NULL,  -- scale score (~5100-5800)
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
  rc_scores TEXT NOT NULL DEFAULT '{}',   -- JSON: {"1": 5372, "2": 5485}
  std_scores TEXT NOT NULL DEFAULT '{}',  -- JSON: {"1": 5380, "2": 5465}
  UNIQUE(student_id, test_id)
);
CREATE INDEX idx_scores_student ON scores(student_id);
CREATE INDEX idx_scores_test ON scores(test_id);
CREATE INDEX idx_scores_level ON scores(test_id, level);

-- Assignments: teacher-created interventions
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('ixl', 'lexiacore5', 'reflex', 'khan_academy')),
  group_id INTEGER NOT NULL REFERENCES test_groups(id),
  rc_id INTEGER REFERENCES reporting_categories(id),
  created_after_test_id INTEGER NOT NULL REFERENCES tests(id),
  impacted_test_id INTEGER REFERENCES tests(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Assignment-Standards junction
CREATE TABLE assignment_standards (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  standard_id INTEGER NOT NULL REFERENCES standards(id),
  PRIMARY KEY (assignment_id, standard_id)
);

-- Assignment-Students junction (tracks status)
CREATE TABLE assignment_students (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'started', 'completed')),
  started_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (assignment_id, student_id)
);
CREATE INDEX idx_as_status ON assignment_students(assignment_id, status);
```

### 5.3 Key Queries

#### Students by level for a test
```sql
SELECT s.id, s.name, sc.level, sc.overall_score, sc.rc_scores
FROM students s
JOIN scores sc ON sc.student_id = s.id
WHERE s.roster_id = ? AND sc.test_id = ?
ORDER BY sc.level, s.name;
```

#### Performance level distribution
```sql
SELECT sc.level, COUNT(*) as count
FROM scores sc
JOIN students s ON s.id = sc.student_id
WHERE s.roster_id = ? AND sc.test_id = ?
GROUP BY sc.level;
```

#### DiD calculation for an assignment
```sql
WITH assignment_info AS (
  SELECT a.id, a.created_after_test_id as pre_test, a.impacted_test_id as post_test
  FROM assignments a WHERE a.id = ?
),
treated AS (
  SELECT
    AVG(sc_post.overall_score - sc_pre.overall_score) as avg_gain
  FROM assignment_students as_s
  JOIN assignment_info ai ON 1=1
  JOIN scores sc_pre ON sc_pre.student_id = as_s.student_id AND sc_pre.test_id = ai.pre_test
  JOIN scores sc_post ON sc_post.student_id = as_s.student_id AND sc_post.test_id = ai.post_test
  WHERE as_s.assignment_id = ai.id AND as_s.status = 'completed'
),
control AS (
  SELECT
    AVG(sc_post.overall_score - sc_pre.overall_score) as avg_gain
  FROM students s
  JOIN assignment_info ai ON 1=1
  JOIN scores sc_pre ON sc_pre.student_id = s.id AND sc_pre.test_id = ai.pre_test
  JOIN scores sc_post ON sc_post.student_id = s.id AND sc_post.test_id = ai.post_test
  WHERE s.id NOT IN (
    SELECT student_id FROM assignment_students WHERE assignment_id = ai.id
  )
)
SELECT
  t.avg_gain as treated_gain,
  c.avg_gain as control_gain,
  (t.avg_gain - c.avg_gain) as did_impact
FROM treated t, control c;
```

---

## 6. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/rosters` | List all rosters |
| GET | `/api/test-groups` | List all test groups |
| GET | `/api/test-groups/:id/tests` | List tests in a group |
| GET | `/api/rosters/:rosterId/students?testId=&level=&rc=` | Filtered student list |
| GET | `/api/rosters/:rosterId/performance?testId=` | Level distribution counts |
| GET | `/api/rosters/:rosterId/rc-breakdown?testId=` | RC avg scores by level |
| GET | `/api/students/:id` | Student detail + scores |
| GET | `/api/students/:id/assignments` | Student's assignments |
| GET | `/api/assignments?groupId=` | List assignments for group |
| POST | `/api/assignments` | Create assignment |
| GET | `/api/assignments/:id/impact` | DiD calculation |
| GET | `/api/impact/summary?groupId=` | All assignments DiD summary |
| POST | `/api/external/sync` | External platform sync |
| POST | `/api/seed` | Trigger seed data generation |
| POST | `/api/simulate-sync` | Randomly complete assignments |

---

## 7. UI Component Tree

```
<App>
  <TopBar>
    <RosterSelector />
    <TestGroupSelector />
    <TestToggle />          // PM1 | PM2 | PM3 tabs
  </TopBar>

  <DashboardPage>
    <ClassOverallPerformance>  // 4 performance level cards
      <PerformanceLevelCard /> // Clickable, filters student list
    </ClassOverallPerformance>

    <RCBreakdown>           // Grouped bar chart by RC
      <RCBar />             // Clickable, filters student list
    </RCBreakdown>

    <StudentTable>          // Paginated, sortable, filterable
      <StudentRow />        // Checkbox + scores + assignment count
      <BulkActions>         // "Assign to Selected" button
        <AssignmentSlideOver />
      </BulkActions>
    </StudentTable>

    <AssignmentSummary>     // Table of all assignments
      <AssignmentRow />     // Name, platform, counts, status breakdown
    </AssignmentSummary>
  </DashboardPage>

  <ImpactPage>
    <ImpactCards>           // One per assignment
      <ImpactCard>          // DiD %, sparkline, standard chips
    </ImpactCards>
    <ScatterPlot />         // PM1 vs PM2, treated/control colors
    <ImpactTable />         // Full DiD summary table
  </ImpactPage>

  <StudentPage>
    <StudentHeader />       // Name, level, roster
    <ScoreCards />          // Per-test overall scores
    <RCTable />            // RC breakdown per test
    <StandardsAccordion /> // Expandable standard scores
    <TaskList />           // Assignments + status badges
  </StudentPage>
</App>
```

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads in < 2s with 8,750 students across 250 rosters |
| **Database** | SQLite file-based, no external DB dependency |
| **Deployment** | Single `npm run dev` to start everything |
| **Browser** | Chrome latest (hackathon only) |
| **Responsive** | Desktop-first, min 1280px width |
| **Auth** | None for POC (hardcoded teacher context) |

---

## 9. Seed Data Specification

See `docs/SEED_DATA_SPEC.md` for the full 67k+ record generation strategy (250 rosters × 35 students × 6 tests).

---

## 10. Success Criteria for Hackathon Demo

1. ✅ Dashboard loads with auto-selected roster/test group
2. ✅ Performance level cards render (4 levels) and are clickable
3. ✅ Student table filters by level and RC
4. ✅ Assignment creation flow works end-to-end
5. ✅ "Simulate Sync" button marks random students as completed
6. ✅ Impact page shows DiD % per assignment with visual
7. ✅ Student detail page shows scores across 6 PM tests + assignments
8. ✅ 8,750 student records across 250 rosters load without performance degradation
9. ✅ Multi-window interventions (after PM1, PM3, PM4) with trackable impact
