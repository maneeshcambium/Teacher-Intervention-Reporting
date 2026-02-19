import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Rosters ──────────────────────────────────────────────────────────────────
export const rosters = sqliteTable("rosters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ─── Students ─────────────────────────────────────────────────────────────────
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rosterId: integer("roster_id")
    .notNull()
    .references(() => rosters.id),
  name: text("name").notNull(),
  externalId: text("external_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ─── Test Groups ──────────────────────────────────────────────────────────────
export const testGroups = sqliteTable("test_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────
export const tests = sqliteTable("tests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id")
    .notNull()
    .references(() => testGroups.id),
  sequence: integer("sequence").notNull(),
  name: text("name").notNull(),
  administeredAt: text("administered_at"),
});

// ─── Performance Levels ───────────────────────────────────────────────────────
export const performanceLevels = sqliteTable("performance_levels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: integer("level").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minScore: integer("min_score").notNull(),
  maxScore: integer("max_score"),
  color: text("color").notNull(),
});

// ─── Reporting Categories ─────────────────────────────────────────────────────
export const reportingCategories = sqliteTable("reporting_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
});

// ─── Standards ────────────────────────────────────────────────────────────────
export const standards = sqliteTable("standards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rcId: integer("rc_id")
    .notNull()
    .references(() => reportingCategories.id),
  domain: text("domain").notNull(),
  subDomain: text("sub_domain"),
  code: text("code").notNull(),
  description: text("description").notNull(),
});

// ─── Scores ───────────────────────────────────────────────────────────────────
export const scores = sqliteTable(
  "scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    testId: integer("test_id")
      .notNull()
      .references(() => tests.id),
    overallScore: integer("overall_score").notNull(),
    level: integer("level").notNull(),
    rcScores: text("rc_scores").notNull().default("{}"),
    stdScores: text("std_scores").notNull().default("{}"),
  },
  (table) => [uniqueIndex("scores_student_test_unique").on(table.studentId, table.testId)]
);

// ─── Assignments ──────────────────────────────────────────────────────────────
export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  groupId: integer("group_id")
    .notNull()
    .references(() => testGroups.id),
  rcId: integer("rc_id").references(() => reportingCategories.id),
  createdAfterTestId: integer("created_after_test_id")
    .notNull()
    .references(() => tests.id),
  impactedTestId: integer("impacted_test_id").references(() => tests.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ─── Assignment Standards (junction) ──────────────────────────────────────────
export const assignmentStandards = sqliteTable(
  "assignment_standards",
  {
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    standardId: integer("standard_id")
      .notNull()
      .references(() => standards.id),
  },
  (table) => [primaryKey({ columns: [table.assignmentId, table.standardId] })]
);

// ─── Assignment Students (junction) ──────────────────────────────────────────
export const assignmentStudents = sqliteTable(
  "assignment_students",
  {
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    status: text("status").notNull().default("not_started"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [primaryKey({ columns: [table.assignmentId, table.studentId] })]
);

// ─── Inferred Types ──────────────────────────────────────────────────────────
export type Roster = typeof rosters.$inferSelect;
export type InsertRoster = typeof rosters.$inferInsert;

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

export type TestGroup = typeof testGroups.$inferSelect;
export type InsertTestGroup = typeof testGroups.$inferInsert;

export type Test = typeof tests.$inferSelect;
export type InsertTest = typeof tests.$inferInsert;

export type PerformanceLevel = typeof performanceLevels.$inferSelect;
export type InsertPerformanceLevel = typeof performanceLevels.$inferInsert;

export type ReportingCategory = typeof reportingCategories.$inferSelect;
export type InsertReportingCategory = typeof reportingCategories.$inferInsert;

export type Standard = typeof standards.$inferSelect;
export type InsertStandard = typeof standards.$inferInsert;

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

export type AssignmentStandard = typeof assignmentStandards.$inferSelect;
export type InsertAssignmentStandard = typeof assignmentStandards.$inferInsert;

export type AssignmentStudent = typeof assignmentStudents.$inferSelect;
export type InsertAssignmentStudent = typeof assignmentStudents.$inferInsert;
