# Seed Data Specification — Realistic Scale Data

## Overview

This document specifies the exact data generation strategy for the Teacher Intervention Dashboard POC. The seed data must be realistic enough to demonstrate meaningful DiD (Difference-in-Differences) impact analysis, with realistic class sizes (~35 students) and multiple test windows (6 PMs per year).

---

## Record Counts

| Entity | Count | Notes |
|--------|-------|-------|
| Rosters | 250 | ~50 teachers × 5 class periods each |
| Students | 8,750 | ~35 per roster (realistic class size) |
| Test Groups | 1 | "Progress Monitoring (PM)" |
| Tests | 6 | PM1–PM6 across the school year |
| Performance Levels | 4 | Beginning, Approaching, Understands, Advanced |
| Reporting Categories | 4 | RC1–RC4 |
| Standards | 20 | 5 per RC |
| Scores | 52,500 | 8,750 students × 6 tests |
| Assignments | 8 | Across 3 intervention windows |
| Assignment-Standards | 20 | Across 8 assignments |
| Assignment-Students | ~6,000 | L1+L2 students from multiple rosters |

**Total rows: ~67,500+**

---

## Student Name Generation

Use these arrays to generate realistic names:

### First Names (50)
```
Emma, Liam, Olivia, Noah, Ava, Elijah, Sophia, Lucas, Isabella, Mason,
Mia, Logan, Charlotte, Alexander, Amelia, Ethan, Harper, Aiden, Evelyn, Sebastian,
Abigail, Jackson, Emily, Mateo, Ella, Henry, Scarlett, Owen, Grace, Leo,
Chloe, Daniel, Victoria, James, Riley, Benjamin, Aria, Jack, Lily, William,
Zoey, Oliver, Penelope, Theodore, Layla, Levi, Nora, Samuel, Camila, Wyatt
```

### Last Names (50)
```
Smith, Johnson, Williams, Brown, Jones, Garcia, Miller, Davis, Rodriguez, Martinez,
Hernandez, Lopez, Gonzalez, Wilson, Anderson, Thomas, Taylor, Moore, Jackson, Martin,
Lee, Perez, Thompson, White, Harris, Sanchez, Clark, Ramirez, Lewis, Robinson,
Walker, Young, Allen, King, Wright, Scott, Torres, Nguyen, Hill, Flores,
Green, Adams, Nelson, Baker, Hall, Rivera, Campbell, Mitchell, Carter, Roberts
```

**Generation**: `firstName[random] + " " + lastName[random]` — duplicates are acceptable.

---

## Roster Generation

Generate 250 rosters across 50 teachers with 5 class periods each:

```typescript
const teachers = [
  'Mrs. Johnson', 'Mr. Smith', 'Ms. Garcia', 'Mrs. Lee', 'Mr. Davis',
  'Mrs. Wilson', 'Mr. Martinez', 'Ms. Anderson', 'Mrs. Thomas', 'Mr. Taylor',
  // ... generate 50 total using first/last name arrays
];
const subjects = ['3rd Grade Math', '4th Grade Math', '3rd Grade ELA', '5th Grade Math', '4th Grade ELA'];
const periods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5'];

// Each teacher gets 5 rosters (one per period)
for (const teacher of teachers) {
  for (const period of periods) {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    createRoster(`${teacher} - ${subject} (${period})`);
  }
}
```

Each roster gets **35 students** (range 30–40 for variety).

---

## Performance Levels (4 Levels)

Seed the `performance_levels` table with exactly 4 rows:

| id | name | label | description | color | min_score | max_score |
|----|------|-------|-------------|-------|-----------|-----------|
| 1 | Beginning to Understand | Beginning | Below Proficiency: Student demonstrates limited understanding of grade-level concepts and requires extensive support to access content. | #EF4444 | 0 | 5410 |
| 2 | Approaching Understanding | Approaching | Approaching Proficiency: Student demonstrates partial understanding of grade-level concepts and requires targeted support to reach proficiency. | #F97316 | 5410 | 5470 |
| 3 | Understands | Proficient | At Proficiency: Student demonstrates adequate understanding of grade-level concepts and meets expectations for the standard. | #22C55E | 5470 | 5530 |
| 4 | Advanced Understanding | Advanced | Above Proficiency: Student demonstrates thorough understanding of grade-level concepts and can apply knowledge in complex or novel situations. | #3B82F6 | 5530 | 9999 |

---

## Score Distribution Model

### Scale Score System

All scores use **scale scores** (integer range ~5100–5800), matching real assessment platforms like STAAR, MAP, etc.

### PM1 Baseline Scores

Use a **truncated normal distribution** to generate realistic score distributions:

```typescript
function generateScaleScore(mean: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const score = mean + z * stdDev;
  return Math.max(5100, Math.min(5800, Math.round(score)));
}
```

**Parameters**: mean = 5440, stdDev = 95

This produces approximately:
- Level 1 — Beginning to Understand (< 5410): ~35-40%
- Level 2 — Approaching Understanding (5410–5469): ~20-25%
- Level 3 — Understands (5470–5529): ~18-22%
- Level 4 — Advanced Understanding (≥ 5530): ~15-20%

### Level Thresholds

```typescript
function scoreToLevel(score: number): number {
  if (score < 5410) return 1;  // Beginning to Understand
  if (score < 5470) return 2;  // Approaching Understanding
  if (score < 5530) return 3;  // Understands
  return 4;                     // Advanced Understanding
}
```

### RC Score Generation

For each student's test score:
1. Generate overall score using the distribution above
2. For each of 4 RCs: `rcScore = overall + randomInt(-50, 50)`, clamped to 5100–5800
3. Ensure that the average of RC scores ≈ overall score (adjust last RC if needed)

### Standard Score Generation

For each RC score:
1. For each of 5 standards in that RC: `stdScore = rcScore + randomInt(-30, 30)`, clamped to 5100–5800

### JSON Storage Format

```json
// rc_scores column (keys are RC ids)
{"1": 5365, "2": 5458, "3": 5472, "4": 5361}

// std_scores column (keys are standard ids)
{"1": 5362, "2": 5368, "3": 5370, "4": 5355, "5": 5360, "6": 5458, "7": 5452, "8": 5461, "9": 5455, "10": 5463, "11": 5475, "12": 5469, "13": 5472, "14": 5470, "15": 5474, "16": 5358, "17": 5363, "18": 5365, "19": 5360, "20": 5362}
```

Keys are the standard/RC `id` values (as strings).

---

## PM2 Score Generation (The Growth Model)

PM2 scores are generated AFTER assignments are created and student assignment statuses are set. The growth model creates the intentional bias needed for meaningful DiD results.

### Growth Categories

| Category | Definition | Growth Model |
|----------|-----------|-------------|
| **Completed** | `assignment_students.status = 'completed'` | +15 to +25 on **aligned standards**, ±5 on others |
| **Started** | `assignment_students.status = 'started'` | +5 to +12 on aligned standards, ±5 on others |
| **Not Started** | `assignment_students.status = 'not_started'` | ±5 on all standards (same as control) |
| **Control** | Student has NO assignment records | ±5 on all standards (natural variation) |

### Growth Application Algorithm

```typescript
function generatePM2Score(student, pm1Score, assignments) {
  const pm1StdScores = JSON.parse(pm1Score.stdScores);
  const pm2StdScores = { ...pm1StdScores };
  
  // For each standard
  for (const [stdId, pm1StdScore] of Object.entries(pm1StdScores)) {
    let growth = randomInt(-5, 5); // Base natural growth
    
    // Check if this standard is aligned to any completed assignment
    for (const assignment of assignments) {
      const studentAssignment = assignment.students.find(s => s.id === student.id);
      if (!studentAssignment) continue;
      
      const isAligned = assignment.standardIds.includes(Number(stdId));
      if (!isAligned) continue;
      
      if (studentAssignment.status === 'completed') {
        growth = randomInt(15, 25);  // Strong growth
      } else if (studentAssignment.status === 'started') {
        growth = randomInt(5, 12);   // Moderate growth
      }
      // 'not_started' keeps the base natural growth
    }
    
    pm2StdScores[stdId] = clamp(pm1StdScore + growth, 0, 100);
  }
  
  // Recompute RC scores as averages of their standards
  const pm2RcScores = {};
  for (const rc of reportingCategories) {
    const rcStandardIds = standards.filter(s => s.rcId === rc.id).map(s => String(s.id));
    const rcStdScores = rcStandardIds.map(id => pm2StdScores[id]);
    pm2RcScores[rc.id] = Math.round(average(rcStdScores));
  }
  
  // Recompute overall as average of RC scores
  const overall = Math.round(average(Object.values(pm2RcScores)));
  const level = scoreToLevel(overall);
  
  return { overall, level, rcScores: pm2RcScores, stdScores: pm2StdScores };
}
```

### Expected DiD Results

With this growth model, the expected DiD for each assignment:

| Assignment | Treated Growth | Control Growth | Expected DiD |
|-----------|---------------|----------------|-------------|
| Fractions Foundations | +18 ± 3 | +2 ± 3 | **~16%** |
| Multiplication Mastery | +18 ± 3 | +2 ± 3 | **~16%** |
| Equation Explorer | +18 ± 3 | +2 ± 3 | **~16%** |
| Shape Shifters | +18 ± 3 | +2 ± 3 | **~16%** |

The DiD should be between 12% and 22% for each assignment, demonstrating clear intervention effectiveness.

---

## Assignment Student Selection

Assignments are created at 3 intervention windows:

### Window 1: After PM1 (4 assignments)
Assign students from **Rosters 1–50** (first 50 rosters) with PM1 level = 1 or level = 2:
- "Fractions Foundations" (IXL, RC1, standards: 3.NF.A.1, 3.NF.A.2, 3.NF.A.3)
- "Multiplication Mastery" (Khan Academy, RC1, standards: 3.OA.A.1, 3.OA.A.2)
- "Equation Explorer" (Reflex, RC2, standards: 3.OA.B.5, 3.OA.B.6)
- "Shape Shifters" (LexiaCore5, RC3, standards: 3.MD.A.1, 3.MD.A.2)

### Window 2: After PM3 (2 assignments)
Assign students from **Rosters 1–50** who are STILL at level 1 or 2 in PM3:
- "Fractions Booster" (IXL, RC1, standards: 3.NF.A.1, 3.NF.A.3)
- "Algebra Accelerator" (Khan Academy, RC2, standards: 3.OA.C.7, 3.OA.D.8)

### Window 3: After PM4 (2 assignments)
Assign students from **Rosters 51–100** with PM4 level = 1 or 2:
- "Geometry Jumpstart" (Reflex, RC3, standards: 3.MD.B.3, 3.MD.B.4, 3.G.A.1)
- "Data & Probability Prep" (Khan Academy, RC4, standards: 3.MD.C.5, 3.MD.C.6)

Expected total: ~6,000 assignment-student records across all 8 assignments.

### Status Distribution

For each assignment-student record (adjust date ranges per intervention window):
```typescript
// Window 1 (after PM1): dates between Aug 2025 and Oct 2025
// Window 2 (after PM3): dates between Dec 2025 and Feb 2026
// Window 3 (after PM4): dates between Feb 2026 and Apr 2026
const rand = Math.random();
if (rand < 0.60) {
  status = 'completed';
  completedAt = randomDateBetween(windowStart, windowEnd);
  startedAt = randomDateBetween(windowStart, completedAt);
} else if (rand < 0.75) {
  status = 'started';
  startedAt = randomDateBetween(windowStart, windowEnd);
} else {
  status = 'not_started';
}
```

---

## Performance Optimization

### Batch Insert Strategy

```typescript
// Use SQLite transactions + prepared statements for speed
const BATCH_SIZE = 1000;

function batchInsert(table, records) {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    db.transaction(() => {
      const stmt = sqlite.prepare(`INSERT INTO ${table} (...) VALUES (...)`);
      for (const record of batch) {
        stmt.run(...Object.values(record));
      }
    });
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} into ${table}`);
  }
}
```

### Expected Timing

| Operation | Expected Duration |
|-----------|------------------|
| Create rosters + test groups + tests + RCs + standards + performance_levels | < 100ms |
| Insert 8,750 students (250 rosters × 35) | ~1s |
| Insert 8,750 PM1 scores | ~2s |
| Create assignments + assignment_students (~6,000 records) | ~1s |
| Insert 43,750 PM2–PM6 scores (with sequential growth model) | ~10s |
| Create indexes | ~2s |
| **Total** | **< 18s** |

### Verification Queries

Run these after seeding to validate:

```sql
-- Total counts (expected: 8,750 students, 52,500 scores, ~6,000 assignment_students)
SELECT 'students' as tbl, COUNT(*) FROM students
UNION ALL SELECT 'scores', COUNT(*) FROM scores
UNION ALL SELECT 'assignment_students', COUNT(*) FROM assignment_students;

-- Should have 4 performance levels
SELECT * FROM performance_levels ORDER BY min_score;

-- Level distribution for PM1 (should be roughly 38/25/20/17 across L1-L4)
SELECT level, COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM scores WHERE test_id = 1), 1) as pct
FROM scores WHERE test_id = 1 GROUP BY level ORDER BY level;

-- Score range should be ~5100-5800
SELECT MIN(overall_score), MAX(overall_score), ROUND(AVG(overall_score)) FROM scores WHERE test_id = 1;

-- Average growth PM1→PM2 by assignment status (should show clear differentiation)
SELECT 
  as_s.status,
  ROUND(AVG(sc2.overall_score - sc1.overall_score), 1) as avg_growth,
  COUNT(*) as n
FROM assignment_students as_s
JOIN scores sc1 ON sc1.student_id = as_s.student_id AND sc1.test_id = 1
JOIN scores sc2 ON sc2.student_id = as_s.student_id AND sc2.test_id = 2
WHERE as_s.assignment_id = 1
GROUP BY as_s.status;

-- Cumulative growth PM1→PM6 for treated vs control (treated should show ~50+ pts gain)
SELECT 
  CASE WHEN s.id IN (SELECT student_id FROM assignment_students) THEN 'treated' ELSE 'control' END as grp,
  ROUND(AVG(sc6.overall_score - sc1.overall_score), 1) as avg_growth,
  COUNT(*) as n
FROM students s
JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = 1
JOIN scores sc6 ON sc6.student_id = s.id AND sc6.test_id = 6
GROUP BY grp;

-- Control group per-window growth (should be ~0 ± 15)
SELECT ROUND(AVG(sc2.overall_score - sc1.overall_score), 1) as avg_growth
FROM students s
JOIN scores sc1 ON sc1.student_id = s.id AND sc1.test_id = 1
JOIN scores sc2 ON sc2.student_id = s.id AND sc2.test_id = 2
WHERE s.id NOT IN (SELECT student_id FROM assignment_students);
```
