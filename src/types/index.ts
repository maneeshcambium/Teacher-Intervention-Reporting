// ─── API Response Types ─────────────────────────────────────────────────────

export interface PerformanceLevelInfo {
  level: number;
  name: string;
  description: string;
  color: string;
  count: number;
  percentage: number;
}

export interface PerformanceResponse {
  levels: PerformanceLevelInfo[];
  total: number;
}

export interface RCByLevel {
  level: number;
  avgScore: number;
}

export interface RCBreakdownCategory {
  rcId: number;
  rcName: string;
  byLevel: RCByLevel[];
}

export interface RCBreakdownResponse {
  categories: RCBreakdownCategory[];
}

export interface StudentRow {
  id: number;
  name: string;
  level: number;
  overallScore: number;
  rcScores: Record<string, number>;
  assignmentCount: number;
}

export interface StudentsResponse {
  students: StudentRow[];
  total: number;
}

export interface Roster {
  id: number;
  name: string;
  createdAt: string | null;
}

export interface TestGroup {
  id: number;
  name: string;
}

export interface Test {
  id: number;
  groupId: number;
  sequence: number;
  name: string;
  administeredAt: string | null;
}

export interface PerformanceLevel {
  id: number;
  level: number;
  name: string;
  description: string;
  minScore: number;
  maxScore: number | null;
  color: string;
}

// ─── Filter & Sort Types ────────────────────────────────────────────────────

export type SortField = "name" | "level" | "overallScore" | string;
export type SortOrder = "asc" | "desc";

export interface StudentFilters {
  level?: number | null;
  rc?: number | null;
  search?: string;
  sort?: SortField;
  order?: SortOrder;
}

// ─── Reporting Categories ───────────────────────────────────────────────────

export interface StandardInfo {
  id: number;
  code: string;
  description: string;
}

export interface SubDomainInfo {
  name: string;
  standards: StandardInfo[];
}

export interface DomainInfo {
  name: string;
  subDomains: SubDomainInfo[];
}

export interface ReportingCategoryWithStandards {
  id: number;
  name: string;
  domains: DomainInfo[];
}

// ─── Assignment Types ───────────────────────────────────────────────────────

export interface AssignmentListItem {
  id: number;
  name: string;
  platform: string;
  rcName: string;
  standards: string[];
  totalStudents: number;
  notStarted: number;
  started: number;
  completed: number;
  createdAt: string;
  createdAfterTestId: number;
}

export interface CreateAssignmentInput {
  name: string;
  platform: string;
  rcId: number;
  groupId: number;
  createdAfterTestId: number;
  impactedTestId: number;
  standardIds: number[];
  studentIds: number[];
}

export interface CreateAssignmentResponse {
  id: number;
  name: string;
  platform: string;
  standardCount: number;
  studentCount: number;
  createdAt: string;
}

// ─── Assignment Student List ────────────────────────────────────────────────

export interface AssignmentStudentRow {
  studentId: number;
  studentName: string;
  status: string;
}

// ─── Impact Analysis Types ──────────────────────────────────────────────────

export interface StudentPoint {
  studentId: number;
  pre: number;
  post: number;
}

export interface StandardDiDSummary {
  code: string;
  treatedDelta: number;
  controlDelta: number;
  didImpact: number;
}

export interface ImpactResult {
  assignmentId: number;
  assignmentName: string;
  platform: string;
  standards: string[];
  rcName: string;

  // Filter metadata
  createdAfterTestId: number;
  rosterIds: number[];

  // Window info
  preTestName: string;
  postTestName: string;

  // Treated group stats
  treatedCount: number;
  treatedPreAvg: number;
  treatedPostAvg: number;
  treatedDelta: number;

  // Control group stats
  controlCount: number;
  controlPreAvg: number;
  controlPostAvg: number;
  controlDelta: number;

  // DiD result
  didImpact: number;
  didImpactPercent: number;

  // Statistical significance
  pValue: number | null;
  isSignificant: boolean;

  // Per-standard DiD breakdown (inline in summary cards)
  standardImpacts?: StandardDiDSummary[];

  // Raw data for scatter plot (only in single-assignment detail)
  treatedPoints?: StudentPoint[];
  controlPoints?: StudentPoint[];
}

export interface ImpactSummaryResponse {
  impacts: ImpactResult[];
  calculatedAt: string;
}

// ─── Student Detail Types ───────────────────────────────────────────────────

export interface RCScoreDetail {
  name: string;
  score: number;
}

export interface StdScoreDetail {
  code: string;
  description: string;
  rcId: number;
  score: number;
}

export interface StudentTestScore {
  testId: number;
  testName: string;
  sequence: number;
  administeredAt: string | null;
  overallScore: number;
  level: number;
  rcScores: Record<string, RCScoreDetail>;
  stdScores: Record<string, StdScoreDetail>;
}

export interface StudentDetail {
  id: number;
  name: string;
  rosterId: number;
  rosterName: string;
  externalId: string | null;
  scores: StudentTestScore[];
}

export interface StudentAssignmentDetail {
  assignmentId: number;
  name: string;
  platform: string;
  standards: { id: number; code: string; description: string }[];
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  preTestName: string;
  postTestName: string | null;
}

export interface StudentAssignmentsResponse {
  assignments: StudentAssignmentDetail[];
}

// ─── Standards Analysis Types ───────────────────────────────────────────────

export interface StandardLevelBreakdown {
  level: number;
  avgScore: number;
  count: number;
}

export interface StandardBreakdownItem {
  standardId: number;
  code: string;
  description: string;
  domain: string;
  overallAvg: number;
  belowProficiencyCount: number;
  totalCount: number;
  belowProficiencyPct: number;
  byLevel: StandardLevelBreakdown[];
}

export interface StandardsBreakdownCategory {
  rcId: number;
  rcName: string;
  standards: StandardBreakdownItem[];
}

export interface StandardsBreakdownResponse {
  categories: StandardsBreakdownCategory[];
}

export interface StandardStudentRow {
  id: number;
  name: string;
  overallScore: number;
  overallLevel: number;
  standardScore: number;
  isProficient: boolean;
  hasAssignment: boolean;
}

export interface StandardStudentsResponse {
  standard: {
    id: number;
    code: string;
    description: string;
    rcId: number;
    rcName: string;
  };
  students: StandardStudentRow[];
}

// ─── Standard-Level Impact Types ────────────────────────────────────────────

export interface StandardDiDResult {
  standardId: number;
  code: string;
  description: string;
  treatedCount: number;
  treatedPreAvg: number;
  treatedPostAvg: number;
  treatedDelta: number;
  controlCount: number;
  controlPreAvg: number;
  controlPostAvg: number;
  controlDelta: number;
  didImpact: number;
  pValue: number | null;
  isSignificant: boolean;
}

export interface StandardImpactResult {
  assignmentId: number;
  assignmentName: string;
  platform: string;
  rcName: string;
  preTestName: string;
  postTestName: string;
  overallDidImpact: number;
  standards: StandardDiDResult[];
}

// ─── Student × Standard Matrix (Heatmap) Types ─────────────────────────────

export interface StudentStandardScores {
  id: number;
  name: string;
  overallScore: number;
  level: number;
  standardScores: Record<string, number>;
}

export interface HeatmapStandard {
  id: number;
  code: string;
  description: string;
  rcId: number;
  rcName: string;
}

export interface HeatmapSummary {
  proficiencyThreshold: number;
  classAvgByStandard: Record<string, number>;
  belowProfByStandard: Record<string, number>;
}

export interface StudentStandardMatrixResponse {
  students: StudentStandardScores[];
  standards: HeatmapStandard[];
  summary: HeatmapSummary;
}
