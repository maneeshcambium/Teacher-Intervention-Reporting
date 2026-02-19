# Phase 1 Prompt: Data Layer + Seed Script

> **Feed this entire file to Replit Agent or GitHub Copilot Chat.**
> **Context**: This is a Next.js 14 (App Router) + TypeScript project using Drizzle ORM with SQLite (better-sqlite3).

---

## Task

Build the complete data layer for a Teacher Intervention Dashboard. This includes:

1. Drizzle ORM schema definition
2. Database connection singleton
3. Seed script that generates 67,000+ realistic records
4. Basic API routes to verify data

## File 1: `src/lib/schema.ts`

Define the following Drizzle tables using `drizzle-orm/sqlite-core`:

### Tables

**rosters**
- `id`: integer, primary key, autoincrement
- `name`: text, not null
- `createdAt`: text, default `datetime('now')`

**students**
- `id`: integer, primary key, autoincrement
- `rosterId`: integer, not null, references rosters.id
- `name`: text, not null
- `externalId`: text (nullable, for external platform mapping)
- `createdAt`: text, default `datetime('now')`

**testGroups**
- `id`: integer, primary key, autoincrement
- `name`: text, not null

**tests**
- `id`: integer, primary key, autoincrement
- `groupId`: integer, not null, references testGroups.id
- `sequence`: integer, not null
- `name`: text, not null
- `administeredAt`: text (nullable)

**reportingCategories**
- `id`: integer, primary key, autoincrement
- `name`: text, not null
- `description`: text (nullable)

**standards**
- `id`: integer, primary key, autoincrement
- `rcId`: integer, not null, references reportingCategories.id
- `domain`: text, not null
- `subDomain`: text (nullable)
- `code`: text, not null (e.g., "3.NF.A.1")
- `description`: text, not null

**performanceLevels** (reference table)
- `id`: integer, primary key, autoincrement
- `level`: integer, not null, unique
- `name`: text, not null
- `description`: text, not null
- `minScore`: integer, not null
- `maxScore`: integer (nullable — null for the top level)
- `color`: text, not null

Seed this table with 4 rows:
| level | name | description | minScore | maxScore | color |
|-------|------|-------------|----------|----------|-------|
| 1 | Beginning to Understand | Below proficiency: Student has not yet demonstrated understanding of key concepts. | 0 | 5409 | #EF4444 |
| 2 | Approaching Understanding | Near proficiency: Student shows partial understanding and is approaching grade-level expectations. | 5410 | 5469 | #F97316 |
| 3 | Understands | At proficiency: Student demonstrates solid understanding of grade-level concepts. | 5470 | 5529 | #22C55E |
| 4 | Advanced Understanding | Above proficiency: Student exceeds expectations and demonstrates deep understanding. | 5530 | 5800 | #3B82F6 |

**scores**
- `id`: integer, primary key, autoincrement
- `studentId`: integer, not null, references students.id
- `testId`: integer, not null, references tests.id
- `overallScore`: integer, not null (scale score, range ~5100–5800)
- `level`: integer, not null (1–4, references performanceLevels.level)
- `rcScores`: text, not null, default '{}' (JSON string: `{"1": 5420, "2": 5510}`)
- `stdScores`: text, not null, default '{}' (JSON string: `{"1": 5380, "2": 5465}`)
- unique constraint on (studentId, testId)

**assignments**
- `id`: integer, primary key, autoincrement
- `name`: text, not null
- `platform`: text, not null (one of: 'ixl', 'lexiacore5', 'reflex', 'khan_academy')
- `groupId`: integer, not null, references testGroups.id
- `rcId`: integer, references reportingCategories.id
- `createdAfterTestId`: integer, not null, references tests.id
- `impactedTestId`: integer, references tests.id
- `createdAt`: text, default `datetime('now')`

**assignmentStandards** (junction table)
- `assignmentId`: integer, not null, references assignments.id
- `standardId`: integer, not null, references standards.id
- composite primary key (assignmentId, standardId)

**assignmentStudents** (junction table)
- `assignmentId`: integer, not null, references assignments.id
- `studentId`: integer, not null, references students.id
- `status`: text, not null, default 'not_started' (one of: 'not_started', 'started', 'completed')
- `startedAt`: text (nullable)
- `completedAt`: text (nullable)
- composite primary key (assignmentId, studentId)

Export all tables and their inferred types using `typeof table.$inferSelect` and `typeof table.$inferInsert`.

## File 2: `src/lib/db.ts`

Create a singleton database connection:

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'teacher-dashboard.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
```

Also create the tables using raw SQL if they don't exist (run `sqlite.exec(...)` with the CREATE TABLE statements from the schema).

## File 3: `src/lib/seed.ts`

Build a seed function `seedDatabase()` that generates realistic data:

### Seed Data Requirements

1. **Clear existing data** first (DELETE FROM all tables in reverse dependency order).

2. **Rosters**: Create 250 rosters.
   - Use teacher name + subject combinations (e.g., "Mrs. Johnson - 3rd Grade Math", "Mr. Smith - 4th Grade Math").
   - Provide arrays of 50 teacher last names and 5 subject variants. Combine to generate 250 unique roster names.
   - Example: `"${prefix} ${lastName} - ${subject}"` where prefix is Mr./Mrs./Ms./Dr.

3. **Students**: Create ~35 students per roster = ~8,750 total.
   - Use realistic first/last name arrays (provide 50 first names, 50 last names).
   - Generate `externalId` as `"stu_" + id`.
   - Each roster gets between 30–40 students (randomized) for realistic class sizes.

4. **Test Groups**: Create 1 test group: "Progress Monitoring (PM)".

5. **Tests**: Create 6 tests in the group:
   - PM1 (sequence 1, administered 2025-08-15)
   - PM2 (sequence 2, administered 2025-10-15)
   - PM3 (sequence 3, administered 2025-12-15)
   - PM4 (sequence 4, administered 2026-02-15)
   - PM5 (sequence 5, administered 2026-04-15)
   - PM6 (sequence 6, administered 2026-06-15)

6. **Reporting Categories**: Create 4 RCs:
   - RC1: "Number and Operations"
   - RC2: "Algebraic Reasoning"
   - RC3: "Geometry and Measurement"
   - RC4: "Data Analysis and Probability"

7. **Standards**: Create 5 standards per RC = 20 total. Use realistic codes:
   - RC1: 3.NF.A.1, 3.NF.A.2, 3.NF.A.3, 3.OA.A.1, 3.OA.A.2
   - RC2: 3.OA.B.5, 3.OA.B.6, 3.OA.C.7, 3.OA.D.8, 3.OA.D.9
   - RC3: 3.MD.A.1, 3.MD.A.2, 3.MD.B.3, 3.MD.B.4, 3.G.A.1
   - RC4: 3.MD.C.5, 3.MD.C.6, 3.MD.C.7, 3.MD.D.8, 3.G.A.2
   - Give each a realistic description (e.g., "Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts").

8. **Scores for PM1**: Generate for all ~8,750 students.
   - Overall score: normal distribution, mean 5440, std 95, clamped to 5100–5800.
   - Level based on overall: 1 (<5410), 2 (5410–5469), 3 (5470–5529), 4 (≥5530).
   - `rcScores`: JSON object with RC ids as keys, scale scores as values. Each RC score = overall ± random(0–40).
   - `stdScores`: JSON object with standard ids as keys, scale scores as values. Each std score = parent RC score ± random(0–25).
   - Clamp all scores to 5100–5800.
   - Target distribution: ~38% Level 1, ~25% Level 2, ~20% Level 3, ~17% Level 4.

9. **Assignments**: Create 8 assignments across 3 intervention windows:

   **Window 1 (created after PM1, impacting PM2):**
   - "Fractions Foundations" (IXL, RC1, standards: 3.NF.A.1, 3.NF.A.2, 3.NF.A.3)
   - "Multiplication Mastery" (Khan Academy, RC1, standards: 3.OA.A.1, 3.OA.A.2)
   - "Equation Explorer" (Reflex, RC2, standards: 3.OA.B.5, 3.OA.B.6)
   - "Shape Shifters" (LexiaCore5, RC3, standards: 3.MD.A.1, 3.MD.A.2)

   **Window 2 (created after PM3, impacting PM4):**
   - "Fractions Booster" (IXL, RC1, standards: 3.NF.A.1, 3.NF.A.3)
   - "Algebra Accelerator" (Khan Academy, RC2, standards: 3.OA.C.7, 3.OA.D.8)

   **Window 3 (created after PM4, impacting PM5):**
   - "Geometry Jumpstart" (Reflex, RC3, standards: 3.MD.B.3, 3.MD.B.4, 3.G.A.1)
   - "Data & Probability Prep" (Khan Academy, RC4, standards: 3.MD.C.5, 3.MD.C.6)

10. **Assignment-Students**: For each assignment, select students from the relevant window:
    - **Window 1**: All Level 1 and Level 2 students from rosters 1–80.
    - **Window 2**: All Level 1 students (on PM3) from rosters 81–160.
    - **Window 3**: All Level 1 students (on PM4) from rosters 161–250.
    - Randomly set 60% to 'completed', 15% to 'started', 25% to 'not_started'.
    - For 'completed', set `completedAt` to a random date within the intervention window.
    - For 'started', set `startedAt` to a random date within the intervention window.

11. **Scores for PM2–PM6**: Generate sequentially (PM2 based on PM1, PM3 based on PM2, etc.).
    - **Control students** (no assignments): Each PM = previous PM + random(−15, +15) on each standard.
    - **Assigned and completed**: +40 to +80 on aligned standards per window, ±15 on others.
    - **Assigned and started**: +15 to +35 on aligned standards, ±15 on others.
    - **Assigned but not started**: ±15 on all standards (same as control).
    - Apply growth to **standard scores**, then recompute RC averages, then overall average.
    - Clamp all scores to 5100–5800. Recalculate levels (1–4).

12. **Performance**: Use batch inserts (insert 1000 records at a time) wrapped in transactions for speed. Log progress to console.

### Important

- Use `better-sqlite3`'s synchronous API for seeding (it's much faster than async for bulk inserts).
- The seed should complete in under 30 seconds.
- Use `db.insert().values([...]).onConflictDoNothing()` or raw SQL prepared statements for speed.

## File 4: `src/app/api/seed/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function POST() {
  try {
    const start = Date.now();
    await seedDatabase();
    const elapsed = Date.now() - start;
    return NextResponse.json({ success: true, elapsed: `${elapsed}ms` });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

## File 5: `src/app/api/rosters/route.ts`

Return all rosters, ordered by name.

## File 6: `src/app/api/test-groups/route.ts`

Return all test groups.

## File 7: `src/app/api/test-groups/[id]/tests/route.ts`

Return all tests for the given group_id, ordered by sequence.

## Verification

After implementing, I should be able to:
1. `POST http://localhost:3000/api/seed` → seeds 67k+ records in < 30s
2. `GET http://localhost:3000/api/rosters` → returns 250 rosters
3. `GET http://localhost:3000/api/test-groups` → returns 1 test group
4. `GET http://localhost:3000/api/test-groups/1/tests` → returns 6 tests (PM1–PM6)
5. Performance levels table is populated with 4 levels

Generate all the code. Do not use placeholder comments — write the full implementation.
