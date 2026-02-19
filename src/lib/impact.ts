import { sqlite } from "./db";
import { tTestTwoSample } from "simple-statistics";
import type { ImpactResult, StudentPoint } from "@/types";

interface AssignmentMeta {
  id: number;
  name: string;
  platform: string;
  rcName: string;
  createdAfterTestId: number;
  impactedTestId: number | null;
  groupId: number;
}

interface StandardRow {
  standardId: number;
  code: string;
}

interface TreatedStudentRow {
  studentId: number;
  rosterId: number;
}

interface ScoreRow {
  studentId: number;
  stdScores: string;
}

/**
 * Compute the average of the aligned standard scores for a given student.
 * `stdScores` is a JSON string like {"1": 5300, "2": 5400, ...}
 * `standardIds` are the standard IDs linked to the assignment.
 * Returns the average of the matching standard scores, or null if none found.
 */
function computeAlignedAvg(
  stdScoresJson: string,
  standardIds: number[]
): number | null {
  const parsed = JSON.parse(stdScoresJson) as Record<string, number>;
  const values: number[] = [];
  for (const id of standardIds) {
    const val = parsed[String(id)];
    if (val != null) {
      values.push(val);
    }
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate the DiD impact for a single assignment.
 */
export function calculateAssignmentImpact(
  assignmentId: number,
  includePoints: boolean = false
): ImpactResult | null {
  // 1. Get assignment metadata
  const assignment = sqlite
    .prepare(
      `SELECT a.id, a.name, a.platform, a.created_after_test_id as createdAfterTestId,
              a.impacted_test_id as impactedTestId, a.group_id as groupId,
              COALESCE(rc.name, '') as rcName
       FROM assignments a
       LEFT JOIN reporting_categories rc ON rc.id = a.rc_id
       WHERE a.id = ?`
    )
    .get(assignmentId) as AssignmentMeta | undefined;

  if (!assignment || !assignment.impactedTestId) return null;

  // 1b. Get pre/post test names
  const preTest = sqlite
    .prepare(`SELECT name FROM tests WHERE id = ?`)
    .get(assignment.createdAfterTestId) as { name: string } | undefined;
  const postTest = sqlite
    .prepare(`SELECT name FROM tests WHERE id = ?`)
    .get(assignment.impactedTestId) as { name: string } | undefined;
  const preTestName = preTest?.name ?? `Test ${assignment.createdAfterTestId}`;
  const postTestName = postTest?.name ?? `Test ${assignment.impactedTestId}`;

  // 2. Get linked standards
  const standardRows = sqlite
    .prepare(
      `SELECT ast.standard_id as standardId, s.code
       FROM assignment_standards ast
       JOIN standards s ON s.id = ast.standard_id
       WHERE ast.assignment_id = ?`
    )
    .all(assignmentId) as StandardRow[];

  const standardIds = standardRows.map((r) => r.standardId);
  const standardCodes = standardRows.map((r) => r.code);

  if (standardIds.length === 0) return null;

  const preTestId = assignment.createdAfterTestId;
  const postTestId = assignment.impactedTestId;

  // 3. Get treated students (completed)
  const treatedStudents = sqlite
    .prepare(
      `SELECT asn.student_id as studentId, st.roster_id as rosterId
       FROM assignment_students asn
       JOIN students st ON st.id = asn.student_id
       WHERE asn.assignment_id = ? AND asn.status = 'completed'`
    )
    .all(assignmentId) as TreatedStudentRow[];

  if (treatedStudents.length === 0) {
    return {
      assignmentId: assignment.id,
      assignmentName: assignment.name,
      platform: assignment.platform,
      standards: standardCodes,
      rcName: assignment.rcName,
      preTestName,
      postTestName,
      treatedCount: 0,
      treatedPreAvg: 0,
      treatedPostAvg: 0,
      treatedDelta: 0,
      controlCount: 0,
      controlPreAvg: 0,
      controlPostAvg: 0,
      controlDelta: 0,
      didImpact: 0,
      didImpactPercent: 0,
      pValue: null,
      isSignificant: false,
      ...(includePoints
        ? { treatedPoints: [], controlPoints: [] }
        : {}),
    };
  }

  const treatedStudentIds = treatedStudents.map((s) => s.studentId);
  const rosterIds = [...new Set(treatedStudents.map((s) => s.rosterId))];

  // 4. Get all assigned student IDs (all statuses) to exclude from control
  const allAssignedRows = sqlite
    .prepare(
      `SELECT student_id as studentId FROM assignment_students WHERE assignment_id = ?`
    )
    .all(assignmentId) as { studentId: number }[];
  const allAssignedIds = new Set(allAssignedRows.map((r) => r.studentId));

  // 5. Get control students: in same rosters, NOT assigned to this assignment
  const rosterPlaceholders = rosterIds.map(() => "?").join(",");
  const controlStudents = sqlite
    .prepare(
      `SELECT id as studentId FROM students WHERE roster_id IN (${rosterPlaceholders})`
    )
    .all(...rosterIds) as { studentId: number }[];

  const controlStudentIds = controlStudents
    .map((s) => s.studentId)
    .filter((id) => !allAssignedIds.has(id));

  // 6. Load scores for treated and control students
  function getScoresForStudents(
    studentIds: number[],
    testId: number
  ): Map<number, string> {
    if (studentIds.length === 0) return new Map();
    const placeholders = studentIds.map(() => "?").join(",");
    const rows = sqlite
      .prepare(
        `SELECT student_id as studentId, std_scores as stdScores
         FROM scores
         WHERE student_id IN (${placeholders}) AND test_id = ?`
      )
      .all(...studentIds, testId) as ScoreRow[];
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.studentId, r.stdScores);
    }
    return map;
  }

  // Treated pre/post scores
  const treatedPreScores = getScoresForStudents(treatedStudentIds, preTestId);
  const treatedPostScores = getScoresForStudents(treatedStudentIds, postTestId);

  const treatedPoints: StudentPoint[] = [];
  for (const sid of treatedStudentIds) {
    const preJson = treatedPreScores.get(sid);
    const postJson = treatedPostScores.get(sid);
    if (!preJson || !postJson) continue;
    const pre = computeAlignedAvg(preJson, standardIds);
    const post = computeAlignedAvg(postJson, standardIds);
    if (pre == null || post == null) continue;
    treatedPoints.push({ studentId: sid, pre: Math.round(pre), post: Math.round(post) });
  }

  // Control pre/post scores
  const controlPreScores = getScoresForStudents(controlStudentIds, preTestId);
  const controlPostScores = getScoresForStudents(controlStudentIds, postTestId);

  const controlPoints: StudentPoint[] = [];
  for (const sid of controlStudentIds) {
    const preJson = controlPreScores.get(sid);
    const postJson = controlPostScores.get(sid);
    if (!preJson || !postJson) continue;
    const pre = computeAlignedAvg(preJson, standardIds);
    const post = computeAlignedAvg(postJson, standardIds);
    if (pre == null || post == null) continue;
    controlPoints.push({ studentId: sid, pre: Math.round(pre), post: Math.round(post) });
  }

  // 7. Compute group averages
  const treatedPreAvg = mean(treatedPoints.map((p) => p.pre));
  const treatedPostAvg = mean(treatedPoints.map((p) => p.post));
  const treatedDelta = treatedPostAvg - treatedPreAvg;

  const controlPreAvg = mean(controlPoints.map((p) => p.pre));
  const controlPostAvg = mean(controlPoints.map((p) => p.post));
  const controlDelta = controlPostAvg - controlPreAvg;

  const didImpact = treatedDelta - controlDelta;
  const didImpactPercent =
    treatedPreAvg > 0
      ? Math.round((didImpact / treatedPreAvg) * 1000) / 10
      : 0;

  // 8. Statistical test
  let pValue: number | null = null;
  let isSignificant = false;

  if (treatedPoints.length >= 2 && controlPoints.length >= 2) {
    const treatedGains = treatedPoints.map((p) => p.post - p.pre);
    const controlGains = controlPoints.map((p) => p.post - p.pre);
    try {
      pValue = tTestTwoSample(treatedGains, controlGains);
      if (pValue != null) {
        // tTestTwoSample returns a t-statistic; compute approximate p-value
        // For large samples, use normal approximation
        const tStat = pValue;
        const df = treatedGains.length + controlGains.length - 2;
        // Simple approximation using the t-statistic
        // For a two-tailed test, p ≈ 2 * (1 - Φ(|t|)) for large df
        pValue = approximatePValue(Math.abs(tStat), df);
        isSignificant = pValue < 0.05;
      }
    } catch {
      pValue = null;
      isSignificant = false;
    }
  }

  const result: ImpactResult = {
    assignmentId: assignment.id,
    assignmentName: assignment.name,
    platform: assignment.platform,
    standards: standardCodes,
    rcName: assignment.rcName,
    preTestName,
    postTestName,
    treatedCount: treatedPoints.length,
    treatedPreAvg: Math.round(treatedPreAvg),
    treatedPostAvg: Math.round(treatedPostAvg),
    treatedDelta: Math.round(treatedDelta),
    controlCount: controlPoints.length,
    controlPreAvg: Math.round(controlPreAvg),
    controlPostAvg: Math.round(controlPostAvg),
    controlDelta: Math.round(controlDelta),
    didImpact: Math.round(didImpact),
    didImpactPercent,
    pValue: pValue != null ? Math.round(pValue * 1000) / 1000 : null,
    isSignificant,
  };

  if (includePoints) {
    result.treatedPoints = treatedPoints;
    result.controlPoints = controlPoints;
  }

  return result;
}

/**
 * Approximate p-value from t-statistic using the normal approximation.
 * For df > 30 this is reasonably accurate.
 */
function approximatePValue(tAbs: number, df: number): number {
  // Use a simple approximation: for large df, t → z
  // Better approximation using the formula from Abramowitz and Stegun
  const x = tAbs;
  // Normal CDF approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Adjust t to z for finite df
  const z =
    df > 100
      ? x
      : x * (1 - 1 / (4 * df)) * Math.sqrt(1 + x * x / (2 * df)) ** -0.5 || x;

  const sign = z >= 0 ? 1 : -1;
  const absZ = Math.abs(z);
  const t2 = 1 / (1 + p * absZ);
  const normalCdf =
    1 -
    ((((a5 * t2 + a4) * t2 + a3) * t2 + a2) * t2 + a1) *
      t2 *
      Math.exp(-absZ * absZ / 2);
  const cdf = 0.5 * (1 + sign * (2 * normalCdf - 1));

  // Two-tailed p-value
  return 2 * (1 - cdf);
}

/**
 * Calculate DiD impacts for all assignments in a test group.
 */
export function calculateAllImpacts(groupId: number): ImpactResult[] {
  const assignmentIds = sqlite
    .prepare(`SELECT id FROM assignments WHERE group_id = ?`)
    .all(groupId) as { id: number }[];

  const results: ImpactResult[] = [];
  for (const { id } of assignmentIds) {
    const impact = calculateAssignmentImpact(id, false);
    if (impact) {
      results.push(impact);
    }
  }

  // Sort by didImpact descending
  results.sort((a, b) => b.didImpact - a.didImpact);
  return results;
}
