import { db, sqlite } from "./db";
import {
  scores,
  students,
  performanceLevels,
  reportingCategories,
  standards,
  assignments,
  assignmentStandards,
  assignmentStudents,
  rosters,
  tests,
} from "./schema";
import { eq, and, sql, asc, like } from "drizzle-orm";
import type {
  PerformanceResponse,
  RCBreakdownResponse,
  StudentsResponse,
  StudentFilters,
  ReportingCategoryWithStandards,
  AssignmentListItem,
  CreateAssignmentInput,
  CreateAssignmentResponse,
  StudentDetail,
  StudentTestScore,
  StudentAssignmentDetail,
  StudentAssignmentsResponse,
  StandardsBreakdownResponse,
  StandardStudentsResponse,
} from "@/types";

// ─── Performance Level Distribution ────────────────────────────────────────

export function getPerformanceDistribution(
  rosterId: number,
  testId: number
): PerformanceResponse {
  // Get performance level metadata
  const levels = db
    .select()
    .from(performanceLevels)
    .orderBy(asc(performanceLevels.level))
    .all();

  // Get counts per level
  const countRows = db
    .select({
      level: scores.level,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(and(eq(students.rosterId, rosterId), eq(scores.testId, testId)))
    .groupBy(scores.level)
    .orderBy(asc(scores.level))
    .all();

  const total = countRows.reduce((sum, r) => sum + r.count, 0);

  const result = levels.map((pl) => {
    const found = countRows.find((r) => r.level === pl.level);
    const count = found ? found.count : 0;
    return {
      level: pl.level,
      name: pl.name,
      description: pl.description,
      color: pl.color,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  return { levels: result, total };
}

// ─── RC Breakdown ──────────────────────────────────────────────────────────

export function getRCBreakdown(
  rosterId: number,
  testId: number
): RCBreakdownResponse {
  // Get all reporting categories
  const rcs = db
    .select()
    .from(reportingCategories)
    .orderBy(asc(reportingCategories.id))
    .all();

  // Get all scores for this roster+test
  const scoreRows = db
    .select({
      level: scores.level,
      rcScores: scores.rcScores,
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(and(eq(students.rosterId, rosterId), eq(scores.testId, testId)))
    .all();

  const categories = rcs.map((rc) => {
    // Group scores by level
    const levelMap: Record<number, { sum: number; count: number }> = {};
    for (const row of scoreRows) {
      const parsed = JSON.parse(row.rcScores) as Record<string, number>;
      const rcScore = parsed[String(rc.id)];
      if (rcScore == null) continue;

      if (!levelMap[row.level]) {
        levelMap[row.level] = { sum: 0, count: 0 };
      }
      levelMap[row.level].sum += rcScore;
      levelMap[row.level].count += 1;
    }

    const byLevel = [1, 2, 3, 4]
      .filter((l) => levelMap[l])
      .map((l) => ({
        level: l,
        avgScore: Math.round(levelMap[l].sum / levelMap[l].count),
      }));

    return {
      rcId: rc.id,
      rcName: rc.name,
      byLevel,
    };
  });

  return { categories };
}

// ─── Student List ──────────────────────────────────────────────────────────

export function getStudentList(
  rosterId: number,
  testId: number,
  filters: StudentFilters = {}
): StudentsResponse {
  const { level, rc, search, sort = "name", order = "asc" } = filters;

  // Use raw SQL for complex JSON filtering
  let query = `
    SELECT
      s.id,
      s.name,
      sc.level,
      sc.overall_score as overallScore,
      sc.rc_scores as rcScores,
      COALESCE(ac.assignment_count, 0) as assignmentCount
    FROM students s
    JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
    LEFT JOIN (
      SELECT student_id, COUNT(*) as assignment_count
      FROM assignment_students
      GROUP BY student_id
    ) ac ON ac.student_id = s.id
    WHERE s.roster_id = ?
  `;

  const params: (string | number)[] = [testId, rosterId];

  if (level != null) {
    query += ` AND sc.level = ?`;
    params.push(level);
  }

  if (rc != null) {
    // Filter students whose RC score for this category is below proficiency (5470)
    query += ` AND CAST(JSON_EXTRACT(sc.rc_scores, '$."${rc}"') AS INTEGER) < 5470`;
  }

  if (search) {
    query += ` AND s.name LIKE ?`;
    params.push(`%${search}%`);
  }

  // Sorting
  const sortColumn =
    sort === "name"
      ? "s.name"
      : sort === "level"
        ? "sc.level"
        : sort === "overallScore"
          ? "sc.overall_score"
          : sort.startsWith("rc_")
            ? `CAST(JSON_EXTRACT(sc.rc_scores, '$."${sort.replace("rc_", "")}"') AS INTEGER)`
            : "s.name";

  query += ` ORDER BY ${sortColumn} ${order === "desc" ? "DESC" : "ASC"}`;

  const rows = sqlite.prepare(query).all(...params) as Array<{
    id: number;
    name: string;
    level: number;
    overallScore: number;
    rcScores: string;
    assignmentCount: number;
  }>;

  const studentRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    level: r.level,
    overallScore: r.overallScore,
    rcScores: JSON.parse(r.rcScores) as Record<string, number>,
    assignmentCount: r.assignmentCount,
  }));

  return { students: studentRows, total: studentRows.length };
}

// ─── Performance Levels ────────────────────────────────────────────────────

export function getPerformanceLevels() {
  return db
    .select()
    .from(performanceLevels)
    .orderBy(asc(performanceLevels.level))
    .all();
}

// ─── Reporting Categories with Standards ───────────────────────────────────

export function getReportingCategoriesWithStandards(): ReportingCategoryWithStandards[] {
  const rcs = db.select().from(reportingCategories).orderBy(asc(reportingCategories.id)).all();
  const allStandards = db.select().from(standards).orderBy(asc(standards.id)).all();

  return rcs.map((rc) => {
    const rcStandards = allStandards.filter((s) => s.rcId === rc.id);

    // Group by domain
    const domainMap = new Map<string, Map<string, typeof rcStandards>>();
    for (const std of rcStandards) {
      if (!domainMap.has(std.domain)) {
        domainMap.set(std.domain, new Map());
      }
      const subDomainKey = std.subDomain || "";
      const subMap = domainMap.get(std.domain)!;
      if (!subMap.has(subDomainKey)) {
        subMap.set(subDomainKey, []);
      }
      subMap.get(subDomainKey)!.push(std);
    }

    const domains = Array.from(domainMap.entries()).map(([domainName, subMap]) => ({
      name: domainName,
      subDomains: Array.from(subMap.entries()).map(([subDomainName, stds]) => ({
        name: subDomainName,
        standards: stds.map((s) => ({
          id: s.id,
          code: s.code,
          description: s.description,
        })),
      })),
    }));

    return {
      id: rc.id,
      name: rc.name,
      domains,
    };
  });
}

// ─── Assignments ───────────────────────────────────────────────────────────

export function getAssignments(groupId: number): AssignmentListItem[] {
  const rows = sqlite
    .prepare(
      `
      SELECT
        a.id,
        a.name,
        a.platform,
        a.created_at as createdAt,
        a.created_after_test_id as createdAfterTestId,
        rc.name as rcName,
        (SELECT GROUP_CONCAT(std.code)
         FROM assignment_standards ast
         JOIN standards std ON std.id = ast.standard_id
         WHERE ast.assignment_id = a.id) as standardCodes,
        (SELECT COUNT(*) FROM assignment_students WHERE assignment_id = a.id) as totalStudents,
        (SELECT COUNT(*) FROM assignment_students WHERE assignment_id = a.id AND status = 'not_started') as notStarted,
        (SELECT COUNT(*) FROM assignment_students WHERE assignment_id = a.id AND status = 'started') as started,
        (SELECT COUNT(*) FROM assignment_students WHERE assignment_id = a.id AND status = 'completed') as completed
      FROM assignments a
      LEFT JOIN reporting_categories rc ON rc.id = a.rc_id
      WHERE a.group_id = ?
      ORDER BY a.created_at DESC
    `
    )
    .all(groupId) as Array<{
    id: number;
    name: string;
    platform: string;
    createdAt: string;
    createdAfterTestId: number;
    rcName: string | null;
    standardCodes: string | null;
    totalStudents: number;
    notStarted: number;
    started: number;
    completed: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    platform: r.platform,
    rcName: r.rcName || "",
    standards: r.standardCodes ? r.standardCodes.split(",") : [],
    totalStudents: r.totalStudents,
    notStarted: r.notStarted,
    started: r.started,
    completed: r.completed,
    createdAt: r.createdAt,
    createdAfterTestId: r.createdAfterTestId,
  }));
}

export function createAssignment(input: CreateAssignmentInput): CreateAssignmentResponse {
  const result = sqlite.transaction(() => {
    // 1. Insert into assignments
    const info = sqlite
      .prepare(
        `INSERT INTO assignments (name, platform, group_id, rc_id, created_after_test_id, impacted_test_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.name,
        input.platform,
        input.groupId,
        input.rcId,
        input.createdAfterTestId,
        input.impactedTestId
      );

    const assignmentId = Number(info.lastInsertRowid);

    // 2. Insert assignment_standards
    const insertStd = sqlite.prepare(
      `INSERT INTO assignment_standards (assignment_id, standard_id) VALUES (?, ?)`
    );
    for (const stdId of input.standardIds) {
      insertStd.run(assignmentId, stdId);
    }

    // 3. Insert assignment_students
    const insertStu = sqlite.prepare(
      `INSERT INTO assignment_students (assignment_id, student_id, status) VALUES (?, ?, 'not_started')`
    );
    for (const stuId of input.studentIds) {
      insertStu.run(assignmentId, stuId);
    }

    return {
      id: assignmentId,
      name: input.name,
      platform: input.platform,
      standardCount: input.standardIds.length,
      studentCount: input.studentIds.length,
      createdAt: new Date().toISOString(),
    };
  })();

  return result;
}

export function deleteAssignment(id: number): void {
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM assignment_students WHERE assignment_id = ?").run(id);
    sqlite.prepare("DELETE FROM assignment_standards WHERE assignment_id = ?").run(id);
    sqlite.prepare("DELETE FROM assignments WHERE id = ?").run(id);
  })();
}

export function addStudentsToAssignment(
  assignmentId: number,
  studentIds: number[]
): { added: number } {
  const result = sqlite.transaction(() => {
    // Only insert students not already assigned
    const check = sqlite.prepare(
      `SELECT 1 FROM assignment_students WHERE assignment_id = ? AND student_id = ?`
    );
    const insert = sqlite.prepare(
      `INSERT INTO assignment_students (assignment_id, student_id, status) VALUES (?, ?, 'not_started')`
    );

    let added = 0;
    for (const studentId of studentIds) {
      const existing = check.get(assignmentId, studentId);
      if (!existing) {
        insert.run(assignmentId, studentId);
        added++;
      }
    }
    return { added };
  })();

  return result;
}

// ─── Student Detail ────────────────────────────────────────────────────────

export function getStudentDetail(studentId: number): StudentDetail | null {
  // 1. Get student + roster info
  const studentRow = db
    .select({
      id: students.id,
      name: students.name,
      rosterId: students.rosterId,
      rosterName: rosters.name,
      externalId: students.externalId,
    })
    .from(students)
    .innerJoin(rosters, eq(rosters.id, students.rosterId))
    .where(eq(students.id, studentId))
    .get();

  if (!studentRow) return null;

  // 2. Get all reporting categories and standards for enrichment
  const allRCs = db.select().from(reportingCategories).all();
  const allStandards = db.select().from(standards).all();

  const rcMap = new Map(allRCs.map((rc) => [rc.id, rc.name]));
  const stdMap = new Map(
    allStandards.map((s) => [s.id, { code: s.code, description: s.description, rcId: s.rcId }])
  );

  // 3. Get all scores for this student, JOINed with tests
  const scoreRows = db
    .select({
      testId: scores.testId,
      testName: tests.name,
      sequence: tests.sequence,
      administeredAt: tests.administeredAt,
      overallScore: scores.overallScore,
      level: scores.level,
      rcScores: scores.rcScores,
      stdScores: scores.stdScores,
    })
    .from(scores)
    .innerJoin(tests, eq(tests.id, scores.testId))
    .where(eq(scores.studentId, studentId))
    .orderBy(asc(tests.sequence))
    .all();

  // 4. Enrich scores
  const enrichedScores: StudentTestScore[] = scoreRows.map((row) => {
    const parsedRC = JSON.parse(row.rcScores) as Record<string, number>;
    const parsedStd = JSON.parse(row.stdScores) as Record<string, number>;

    const rcScores: Record<string, { name: string; score: number }> = {};
    for (const [rcId, score] of Object.entries(parsedRC)) {
      rcScores[rcId] = {
        name: rcMap.get(Number(rcId)) || `RC ${rcId}`,
        score,
      };
    }

    const stdScores: Record<string, { code: string; description: string; rcId: number; score: number }> = {};
    for (const [stdId, score] of Object.entries(parsedStd)) {
      const info = stdMap.get(Number(stdId));
      stdScores[stdId] = {
        code: info?.code || `STD-${stdId}`,
        description: info?.description || "",
        rcId: info?.rcId || 0,
        score,
      };
    }

    return {
      testId: row.testId,
      testName: row.testName,
      sequence: row.sequence,
      administeredAt: row.administeredAt,
      overallScore: row.overallScore,
      level: row.level,
      rcScores,
      stdScores,
    };
  });

  return {
    id: studentRow.id,
    name: studentRow.name,
    rosterId: studentRow.rosterId,
    rosterName: studentRow.rosterName,
    externalId: studentRow.externalId,
    scores: enrichedScores,
  };
}

// ─── Student Assignments ───────────────────────────────────────────────────

export function getStudentAssignments(studentId: number): StudentAssignmentsResponse {
  const rows = sqlite
    .prepare(
      `
      SELECT
        a.id as assignmentId,
        a.name,
        a.platform,
        astn.status,
        astn.started_at as startedAt,
        astn.completed_at as completedAt,
        t1.name as preTestName,
        t2.name as postTestName
      FROM assignment_students astn
      JOIN assignments a ON a.id = astn.assignment_id
      JOIN tests t1 ON t1.id = a.created_after_test_id
      LEFT JOIN tests t2 ON t2.id = a.impacted_test_id
      WHERE astn.student_id = ?
      ORDER BY a.created_at DESC
    `
    )
    .all(studentId) as Array<{
    assignmentId: number;
    name: string;
    platform: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    preTestName: string;
    postTestName: string | null;
  }>;

  const allStandardsData = db.select().from(standards).all();
  const stdLookup = new Map(
    allStandardsData.map((s) => [s.id, { id: s.id, code: s.code, description: s.description }])
  );

  const assignmentList: StudentAssignmentDetail[] = rows.map((row) => {
    // Get standards for this assignment
    const stdRows = db
      .select({ standardId: assignmentStandards.standardId })
      .from(assignmentStandards)
      .where(eq(assignmentStandards.assignmentId, row.assignmentId))
      .all();

    const stdDetails = stdRows
      .map((sr) => stdLookup.get(sr.standardId))
      .filter(Boolean) as { id: number; code: string; description: string }[];

    return {
      assignmentId: row.assignmentId,
      name: row.name,
      platform: row.platform,
      standards: stdDetails,
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      preTestName: row.preTestName,
      postTestName: row.postTestName,
    };
  });

  return { assignments: assignmentList };
}

// ─── Standards Breakdown ───────────────────────────────────────────────────

export function getStandardsBreakdown(
  rosterId: number,
  testId: number
): StandardsBreakdownResponse {
  const rcs = db.select().from(reportingCategories).orderBy(asc(reportingCategories.id)).all();
  const allStandards = db.select().from(standards).orderBy(asc(standards.id)).all();

  const scoreRows = db
    .select({
      level: scores.level,
      stdScores: scores.stdScores,
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(and(eq(students.rosterId, rosterId), eq(scores.testId, testId)))
    .all();

  const PROFICIENCY_THRESHOLD = 5470;

  return {
    categories: rcs.map((rc) => {
      const rcStandards = allStandards.filter((s) => s.rcId === rc.id);

      return {
        rcId: rc.id,
        rcName: rc.name,
        standards: rcStandards.map((std) => {
          const levelMap: Record<number, { sum: number; count: number }> = {};
          let belowCount = 0;
          let totalWithScore = 0;
          let totalSum = 0;

          for (const row of scoreRows) {
            const parsed = JSON.parse(row.stdScores) as Record<string, number>;
            const stdScore = parsed[String(std.id)];
            if (stdScore == null) continue;

            totalWithScore++;
            totalSum += stdScore;
            if (stdScore < PROFICIENCY_THRESHOLD) belowCount++;

            if (!levelMap[row.level]) levelMap[row.level] = { sum: 0, count: 0 };
            levelMap[row.level].sum += stdScore;
            levelMap[row.level].count += 1;
          }

          return {
            standardId: std.id,
            code: std.code,
            description: std.description,
            domain: std.domain,
            overallAvg: totalWithScore > 0 ? Math.round(totalSum / totalWithScore) : 0,
            belowProficiencyCount: belowCount,
            totalCount: totalWithScore,
            belowProficiencyPct:
              totalWithScore > 0
                ? Math.round((belowCount / totalWithScore) * 1000) / 10
                : 0,
            byLevel: [1, 2, 3, 4]
              .filter((l) => levelMap[l])
              .map((l) => ({
                level: l,
                avgScore: Math.round(levelMap[l].sum / levelMap[l].count),
                count: levelMap[l].count,
              })),
          };
        }),
      };
    }),
  };
}

// ─── Students by Standard ──────────────────────────────────────────────────

export function getStudentsByStandard(
  rosterId: number,
  testId: number,
  standardId: number
): StandardStudentsResponse {
  const PROFICIENCY_THRESHOLD = 5470;

  const std = db
    .select()
    .from(standards)
    .where(eq(standards.id, standardId))
    .get();

  if (!std) throw new Error("Standard not found");

  const rc = db
    .select()
    .from(reportingCategories)
    .where(eq(reportingCategories.id, std.rcId))
    .get();

  const rows = sqlite
    .prepare(
      `
      SELECT
        s.id,
        s.name,
        sc.overall_score as overallScore,
        sc.level as overallLevel,
        sc.std_scores as stdScores,
        CASE WHEN EXISTS (
          SELECT 1 FROM assignment_students asn
          JOIN assignment_standards ast ON ast.assignment_id = asn.assignment_id
          WHERE asn.student_id = s.id AND ast.standard_id = ?
        ) THEN 1 ELSE 0 END as hasAssignment
      FROM students s
      JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
      WHERE s.roster_id = ?
      ORDER BY CAST(JSON_EXTRACT(sc.std_scores, '$.' || ?) AS INTEGER) ASC
    `
    )
    .all(standardId, testId, rosterId, String(standardId)) as Array<{
    id: number;
    name: string;
    overallScore: number;
    overallLevel: number;
    stdScores: string;
    hasAssignment: number;
  }>;

  const studentRows = rows.map((r) => {
    const parsed = JSON.parse(r.stdScores) as Record<string, number>;
    const stdScore = parsed[String(standardId)] ?? 0;
    return {
      id: r.id,
      name: r.name,
      overallScore: r.overallScore,
      overallLevel: r.overallLevel,
      standardScore: stdScore,
      isProficient: stdScore >= PROFICIENCY_THRESHOLD,
      hasAssignment: r.hasAssignment === 1,
    };
  });

  return {
    standard: {
      id: std.id,
      code: std.code,
      description: std.description,
      rcId: std.rcId,
      rcName: rc?.name ?? "Unknown",
    },
    students: studentRows,
  };
}
