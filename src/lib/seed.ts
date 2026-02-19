import { sqlite } from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalRandom(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function scoreToLevel(score: number): number {
  if (score < 5410) return 1;
  if (score < 5470) return 2;
  if (score < 5530) return 3;
  return 4;
}

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ─── Data Arrays ──────────────────────────────────────────────────────────────

const TEACHER_LAST_NAMES = [
  "Johnson", "Smith", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
  "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts",
];

const SUBJECTS = [
  "3rd Grade Math",
  "4th Grade Math",
  "3rd Grade Math (Honors)",
  "4th Grade Math (Honors)",
  "3rd Grade Math (Intervention)",
];

const PREFIXES = ["Mr.", "Mrs.", "Ms.", "Dr."];

const FIRST_NAMES = [
  "Aiden", "Sophia", "Liam", "Olivia", "Noah", "Emma", "Jackson", "Ava",
  "Lucas", "Isabella", "Mason", "Mia", "Ethan", "Amelia", "Logan", "Harper",
  "Alexander", "Evelyn", "Jacob", "Abigail", "Michael", "Emily", "Daniel",
  "Elizabeth", "Henry", "Sofia", "Sebastian", "Avery", "Mateo", "Ella",
  "Benjamin", "Scarlett", "James", "Grace", "Leo", "Chloe", "Jack", "Victoria",
  "Owen", "Riley", "Samuel", "Aria", "Ryan", "Lily", "Nathan", "Aurora",
  "Caleb", "Zoey", "Christian", "Penelope",
];

const STUDENT_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
  "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts",
];

const STANDARD_DEFINITIONS = [
  // RC1: Number and Operations
  { rcId: 1, domain: "Number and Operations – Fractions", subDomain: "Developing understanding of fractions", code: "3.NF.A.1", description: "Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts" },
  { rcId: 1, domain: "Number and Operations – Fractions", subDomain: "Developing understanding of fractions", code: "3.NF.A.2", description: "Understand a fraction as a number on the number line; represent fractions on a number line diagram" },
  { rcId: 1, domain: "Number and Operations – Fractions", subDomain: "Developing understanding of fractions", code: "3.NF.A.3", description: "Explain equivalence of fractions in special cases, and compare fractions by reasoning about their size" },
  { rcId: 1, domain: "Operations and Algebraic Thinking", subDomain: "Represent and solve problems", code: "3.OA.A.1", description: "Interpret products of whole numbers as the total number of objects in groups" },
  { rcId: 1, domain: "Operations and Algebraic Thinking", subDomain: "Represent and solve problems", code: "3.OA.A.2", description: "Interpret whole-number quotients of whole numbers as the number of objects in each share" },
  // RC2: Algebraic Reasoning
  { rcId: 2, domain: "Operations and Algebraic Thinking", subDomain: "Understand properties of multiplication", code: "3.OA.B.5", description: "Apply properties of operations as strategies to multiply and divide" },
  { rcId: 2, domain: "Operations and Algebraic Thinking", subDomain: "Understand properties of multiplication", code: "3.OA.B.6", description: "Understand division as an unknown-factor problem" },
  { rcId: 2, domain: "Operations and Algebraic Thinking", subDomain: "Multiply and divide within 100", code: "3.OA.C.7", description: "Fluently multiply and divide within 100 using strategies" },
  { rcId: 2, domain: "Operations and Algebraic Thinking", subDomain: "Solve problems involving the four operations", code: "3.OA.D.8", description: "Solve two-step word problems using the four operations" },
  { rcId: 2, domain: "Operations and Algebraic Thinking", subDomain: "Solve problems involving the four operations", code: "3.OA.D.9", description: "Identify arithmetic patterns and explain them using properties of operations" },
  // RC3: Geometry and Measurement
  { rcId: 3, domain: "Measurement and Data", subDomain: "Solve problems involving measurement", code: "3.MD.A.1", description: "Tell and write time to the nearest minute and measure time intervals in minutes" },
  { rcId: 3, domain: "Measurement and Data", subDomain: "Solve problems involving measurement", code: "3.MD.A.2", description: "Measure and estimate liquid volumes and masses of objects using standard units" },
  { rcId: 3, domain: "Measurement and Data", subDomain: "Represent and interpret data", code: "3.MD.B.3", description: "Draw a scaled picture graph and a scaled bar graph to represent a data set" },
  { rcId: 3, domain: "Measurement and Data", subDomain: "Represent and interpret data", code: "3.MD.B.4", description: "Generate measurement data by measuring lengths using rulers marked with halves and fourths of an inch" },
  { rcId: 3, domain: "Geometry", subDomain: "Reason with shapes and their attributes", code: "3.G.A.1", description: "Understand that shapes in different categories may share attributes and that shared attributes can define a larger category" },
  // RC4: Data Analysis and Probability
  { rcId: 4, domain: "Measurement and Data", subDomain: "Geometric measurement: understand area", code: "3.MD.C.5", description: "Recognize area as an attribute of plane figures and understand concepts of area measurement" },
  { rcId: 4, domain: "Measurement and Data", subDomain: "Geometric measurement: understand area", code: "3.MD.C.6", description: "Measure areas by counting unit squares" },
  { rcId: 4, domain: "Measurement and Data", subDomain: "Geometric measurement: understand area", code: "3.MD.C.7", description: "Relate area to the operations of multiplication and addition" },
  { rcId: 4, domain: "Measurement and Data", subDomain: "Geometric measurement: perimeter", code: "3.MD.D.8", description: "Solve real world and mathematical problems involving perimeters of polygons" },
  { rcId: 4, domain: "Geometry", subDomain: "Reason with shapes and their attributes", code: "3.G.A.2", description: "Partition shapes into parts with equal areas. Express the area of each part as a unit fraction of the whole" },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  console.log("🌱 Starting seed...");
  const t0 = Date.now();

  // Disable foreign keys temporarily for faster seeding
  sqlite.pragma("foreign_keys = OFF");

  // ─── Clear existing data ────────────────────────────────────────────
  console.log("  Clearing existing data...");
  sqlite.exec(`
    DELETE FROM assignment_students;
    DELETE FROM assignment_standards;
    DELETE FROM assignments;
    DELETE FROM scores;
    DELETE FROM standards;
    DELETE FROM reporting_categories;
    DELETE FROM performance_levels;
    DELETE FROM tests;
    DELETE FROM test_groups;
    DELETE FROM students;
    DELETE FROM rosters;
    DELETE FROM sqlite_sequence;
  `);

  // ─── 1. Rosters (250) ──────────────────────────────────────────────
  console.log("  Creating rosters...");
  const insertRoster = sqlite.prepare(
    "INSERT INTO rosters (name) VALUES (?)"
  );
  const rosterTx = sqlite.transaction((names: string[]) => {
    for (const name of names) {
      insertRoster.run(name);
    }
  });

  const rosterNames: string[] = [];
  for (let i = 0; i < TEACHER_LAST_NAMES.length; i++) {
    for (let j = 0; j < SUBJECTS.length; j++) {
      const prefix = PREFIXES[i % PREFIXES.length];
      rosterNames.push(`${prefix} ${TEACHER_LAST_NAMES[i]} - ${SUBJECTS[j]}`);
    }
  }
  rosterTx(rosterNames.slice(0, 250));
  console.log(`    ✓ ${Math.min(rosterNames.length, 250)} rosters created`);

  // ─── 2. Students (~35 per roster = ~8,750) ──────────────────────────
  console.log("  Creating students...");
  const insertStudent = sqlite.prepare(
    "INSERT INTO students (roster_id, name, external_id) VALUES (?, ?, ?)"
  );

  interface StudentRow {
    id: number;
    rosterId: number;
  }

  const allStudents: StudentRow[] = [];
  let studentId = 0;

  const studentTx = sqlite.transaction(() => {
    for (let r = 1; r <= 250; r++) {
      const count = randInt(30, 40);
      for (let s = 0; s < count; s++) {
        studentId++;
        const firstName = FIRST_NAMES[s % FIRST_NAMES.length];
        const lastName =
          STUDENT_LAST_NAMES[(r * 7 + s * 3) % STUDENT_LAST_NAMES.length];
        const name = `${firstName} ${lastName}`;
        insertStudent.run(r, name, `stu_${studentId}`);
        allStudents.push({ id: studentId, rosterId: r });
      }
    }
  });
  studentTx();
  console.log(`    ✓ ${allStudents.length} students created`);

  // ─── 3. Test Group + Tests ──────────────────────────────────────────
  console.log("  Creating test group and tests...");
  sqlite.exec(`INSERT INTO test_groups (name) VALUES ('Progress Monitoring (PM)')`);

  const insertTest = sqlite.prepare(
    "INSERT INTO tests (group_id, sequence, name, administered_at) VALUES (1, ?, ?, ?)"
  );
  const testDates = [
    "2025-08-15",
    "2025-10-15",
    "2025-12-15",
    "2026-02-15",
    "2026-04-15",
    "2026-06-15",
  ];
  const testTx = sqlite.transaction(() => {
    for (let i = 0; i < 6; i++) {
      insertTest.run(i + 1, `PM${i + 1}`, testDates[i]);
    }
  });
  testTx();
  console.log("    ✓ 1 test group, 6 tests created");

  // ─── 4. Performance Levels ──────────────────────────────────────────
  console.log("  Creating performance levels...");
  sqlite.exec(`
    INSERT INTO performance_levels (level, name, description, min_score, max_score, color) VALUES
      (1, 'Beginning to Understand', 'Below proficiency: Student has not yet demonstrated understanding of key concepts.', 0, 5409, '#EF4444'),
      (2, 'Approaching Understanding', 'Near proficiency: Student shows partial understanding and is approaching grade-level expectations.', 5410, 5469, '#F97316'),
      (3, 'Understands', 'At proficiency: Student demonstrates solid understanding of grade-level concepts.', 5470, 5529, '#22C55E'),
      (4, 'Advanced Understanding', 'Above proficiency: Student exceeds expectations and demonstrates deep understanding.', 5530, 5800, '#3B82F6');
  `);
  console.log("    ✓ 4 performance levels created");

  // ─── 5. Reporting Categories ────────────────────────────────────────
  console.log("  Creating reporting categories...");
  sqlite.exec(`
    INSERT INTO reporting_categories (name, description) VALUES
      ('Number and Operations', 'Understanding of number concepts, fractions, and arithmetic operations'),
      ('Algebraic Reasoning', 'Understanding of algebraic relationships, patterns, and problem-solving strategies'),
      ('Geometry and Measurement', 'Understanding of geometric shapes, measurement concepts, and spatial reasoning'),
      ('Data Analysis and Probability', 'Understanding of data representation, interpretation, and area/perimeter concepts');
  `);
  console.log("    ✓ 4 reporting categories created");

  // ─── 6. Standards (20 total) ────────────────────────────────────────
  console.log("  Creating standards...");
  const insertStandard = sqlite.prepare(
    "INSERT INTO standards (rc_id, domain, sub_domain, code, description) VALUES (?, ?, ?, ?, ?)"
  );
  const standardTx = sqlite.transaction(() => {
    for (const s of STANDARD_DEFINITIONS) {
      insertStandard.run(s.rcId, s.domain, s.subDomain, s.code, s.description);
    }
  });
  standardTx();
  console.log("    ✓ 20 standards created");

  // Build standard-to-RC lookup: standardId (1-based) -> rcId
  const stdToRc: Record<number, number> = {};
  const rcToStds: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (let i = 0; i < STANDARD_DEFINITIONS.length; i++) {
    const stdId = i + 1;
    const rcId = STANDARD_DEFINITIONS[i].rcId;
    stdToRc[stdId] = rcId;
    rcToStds[rcId].push(stdId);
  }

  // ─── 7. Scores for PM1 ─────────────────────────────────────────────
  console.log("  Generating PM1 scores...");
  const insertScore = sqlite.prepare(
    "INSERT INTO scores (student_id, test_id, overall_score, level, rc_scores, std_scores) VALUES (?, ?, ?, ?, ?, ?)"
  );

  // Store scores in memory for sequential generation
  // studentScores[studentId] = { std_scores: {stdId: score}, rc_scores: {rcId: score}, overall, level }
  interface StudentScores {
    stdScores: Record<number, number>;
    rcScores: Record<number, number>;
    overall: number;
    level: number;
  }
  const studentScores: Record<number, StudentScores> = {};

  // Use a skewed distribution to hit ~38% L1, ~25% L2, ~20% L3, ~17% L4
  // mean=5440, std=95 gives approximately this distribution
  const scoreTx1 = sqlite.transaction(() => {
    let count = 0;
    for (const stu of allStudents) {
      const overall = clamp(
        Math.round(normalRandom(5440, 95)),
        5100,
        5800
      );
      const level = scoreToLevel(overall);

      const rcScoresObj: Record<number, number> = {};
      const stdScoresObj: Record<number, number> = {};

      for (let rc = 1; rc <= 4; rc++) {
        const rcScore = clamp(overall + randInt(-40, 40), 5100, 5800);
        rcScoresObj[rc] = rcScore;

        for (const stdId of rcToStds[rc]) {
          stdScoresObj[stdId] = clamp(rcScore + randInt(-25, 25), 5100, 5800);
        }
      }

      studentScores[stu.id] = {
        stdScores: stdScoresObj,
        rcScores: rcScoresObj,
        overall,
        level,
      };

      insertScore.run(
        stu.id,
        1, // test_id = 1 (PM1)
        overall,
        level,
        JSON.stringify(rcScoresObj),
        JSON.stringify(stdScoresObj)
      );

      count++;
      if (count % 2000 === 0) {
        console.log(`    ... ${count} PM1 scores`);
      }
    }
  });
  scoreTx1();
  console.log(`    ✓ ${allStudents.length} PM1 scores created`);

  // ─── 8. Assignments ─────────────────────────────────────────────────
  console.log("  Creating assignments...");

  // Standard code to ID mapping
  const codeToId: Record<string, number> = {};
  for (let i = 0; i < STANDARD_DEFINITIONS.length; i++) {
    codeToId[STANDARD_DEFINITIONS[i].code] = i + 1;
  }

  interface AssignmentDef {
    name: string;
    platform: string;
    rcId: number;
    standardCodes: string[];
    createdAfterTestSeq: number; // sequence (1-based) -> test_id
    impactedTestSeq: number;
    window: number; // 1, 2, or 3
  }

  const assignmentDefs: AssignmentDef[] = [
    // Window 1 (after PM1, impacting PM2)
    { name: "Fractions Foundations", platform: "ixl", rcId: 1, standardCodes: ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"], createdAfterTestSeq: 1, impactedTestSeq: 2, window: 1 },
    { name: "Multiplication Mastery", platform: "khan_academy", rcId: 1, standardCodes: ["3.OA.A.1", "3.OA.A.2"], createdAfterTestSeq: 1, impactedTestSeq: 2, window: 1 },
    { name: "Equation Explorer", platform: "reflex", rcId: 2, standardCodes: ["3.OA.B.5", "3.OA.B.6"], createdAfterTestSeq: 1, impactedTestSeq: 2, window: 1 },
    { name: "Shape Shifters", platform: "lexiacore5", rcId: 3, standardCodes: ["3.MD.A.1", "3.MD.A.2"], createdAfterTestSeq: 1, impactedTestSeq: 2, window: 1 },
    // Window 2 (after PM3, impacting PM4)
    { name: "Fractions Booster", platform: "ixl", rcId: 1, standardCodes: ["3.NF.A.1", "3.NF.A.3"], createdAfterTestSeq: 3, impactedTestSeq: 4, window: 2 },
    { name: "Algebra Accelerator", platform: "khan_academy", rcId: 2, standardCodes: ["3.OA.C.7", "3.OA.D.8"], createdAfterTestSeq: 3, impactedTestSeq: 4, window: 2 },
    // Window 3 (after PM4, impacting PM5)
    { name: "Geometry Jumpstart", platform: "reflex", rcId: 3, standardCodes: ["3.MD.B.3", "3.MD.B.4", "3.G.A.1"], createdAfterTestSeq: 4, impactedTestSeq: 5, window: 3 },
    { name: "Data & Probability Prep", platform: "khan_academy", rcId: 4, standardCodes: ["3.MD.C.5", "3.MD.C.6"], createdAfterTestSeq: 4, impactedTestSeq: 5, window: 3 },
  ];

  const insertAssignment = sqlite.prepare(
    "INSERT INTO assignments (name, platform, group_id, rc_id, created_after_test_id, impacted_test_id) VALUES (?, ?, 1, ?, ?, ?)"
  );
  const insertAssignmentStandard = sqlite.prepare(
    "INSERT INTO assignment_standards (assignment_id, standard_id) VALUES (?, ?)"
  );
  const insertAssignmentStudent = sqlite.prepare(
    "INSERT INTO assignment_students (assignment_id, student_id, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?)"
  );

  // Intervention windows (date ranges for generating started_at/completed_at)
  const windowDateRanges: Record<number, { start: string; end: string }> = {
    1: { start: "2025-08-20", end: "2025-10-10" },
    2: { start: "2025-12-20", end: "2026-02-10" },
    3: { start: "2026-02-20", end: "2026-04-10" },
  };

  // Track which students are assigned to which assignments and their aligned standards
  // assignedInfo[studentId] = [ { window, standardIds, status } ]
  interface AssignedInfo {
    window: number;
    standardIds: number[];
    status: string;
  }
  const assignedInfoMap: Record<number, AssignedInfo[]> = {};

  const assignmentTx = sqlite.transaction(() => {
    for (let a = 0; a < assignmentDefs.length; a++) {
      const def = assignmentDefs[a];
      const assignmentId = a + 1;

      insertAssignment.run(
        def.name,
        def.platform,
        def.rcId,
        def.createdAfterTestSeq, // test_id = sequence since only 1 group
        def.impactedTestSeq
      );

      // Insert assignment-standards
      const alignedStdIds: number[] = [];
      for (const code of def.standardCodes) {
        const stdId = codeToId[code];
        insertAssignmentStandard.run(assignmentId, stdId);
        alignedStdIds.push(stdId);
      }

      // Select students for this assignment based on window rules
      let eligibleStudents: StudentRow[] = [];
      const preTestId = def.createdAfterTestSeq;

      if (def.window === 1) {
        // All Level 1 and Level 2 students from rosters 1–80
        eligibleStudents = allStudents.filter((s) => {
          if (s.rosterId < 1 || s.rosterId > 80) return false;
          const sc = studentScores[s.id];
          return sc && (sc.level === 1 || sc.level === 2);
        });
      } else if (def.window === 2) {
        // All Level 1 students (on PM3) from rosters 81–160
        // PM3 scores will be generated later; use PM1 level as proxy for now
        // We'll track these students and apply properly later
        eligibleStudents = allStudents.filter((s) => {
          if (s.rosterId < 81 || s.rosterId > 160) return false;
          const sc = studentScores[s.id];
          return sc && sc.level === 1;
        });
      } else if (def.window === 3) {
        // All Level 1 students (on PM4) from rosters 161–250
        // PM4 scores will be generated later; use PM1 level as proxy
        eligibleStudents = allStudents.filter((s) => {
          if (s.rosterId < 161 || s.rosterId > 250) return false;
          const sc = studentScores[s.id];
          return sc && sc.level === 1;
        });
      }

      const dateRange = windowDateRanges[def.window];

      for (const stu of eligibleStudents) {
        const roll = Math.random();
        let status: string;
        let startedAt: string | null = null;
        let completedAt: string | null = null;

        if (roll < 0.60) {
          status = "completed";
          startedAt = randomDate(dateRange.start, dateRange.end);
          completedAt = randomDate(startedAt, dateRange.end);
        } else if (roll < 0.75) {
          status = "started";
          startedAt = randomDate(dateRange.start, dateRange.end);
        } else {
          status = "not_started";
        }

        insertAssignmentStudent.run(
          assignmentId,
          stu.id,
          status,
          startedAt,
          completedAt
        );

        if (!assignedInfoMap[stu.id]) {
          assignedInfoMap[stu.id] = [];
        }
        assignedInfoMap[stu.id].push({
          window: def.window,
          standardIds: alignedStdIds,
          status,
        });
      }
    }
  });
  assignmentTx();
  console.log("    ✓ 8 assignments created with students and standards");

  // ─── 9. Scores for PM2–PM6 ─────────────────────────────────────────
  console.log("  Generating PM2–PM6 scores...");

  // Build a set of aligned standard IDs per window per student for quick lookup
  // For each PM transition, determine which standards are "treated" for each student
  function getGrowthForStandard(
    studentId: number,
    stdId: number,
    fromTestSeq: number,
    toTestSeq: number
  ): number {
    const infos = assignedInfoMap[studentId];
    if (!infos) return randInt(5, 20); // control / unassigned — natural classroom growth

    // Check if any assignment for this student covers this standard
    // and the window applies to this PM transition
    for (const info of infos) {
      // Window 1 affects PM1->PM2 transition
      // Window 2 affects PM3->PM4 transition
      // Window 3 affects PM4->PM5 transition
      let applies = false;
      if (info.window === 1 && fromTestSeq === 1 && toTestSeq === 2) applies = true;
      if (info.window === 2 && fromTestSeq === 3 && toTestSeq === 4) applies = true;
      if (info.window === 3 && fromTestSeq === 4 && toTestSeq === 5) applies = true;

      if (applies && info.standardIds.includes(stdId)) {
        if (info.status === "completed") {
          return randInt(45, 85); // strong growth from completing the assignment
        } else if (info.status === "started") {
          return randInt(20, 40); // partial growth
        } else {
          return randInt(5, 20); // not_started = same as control (natural growth)
        }
      }
    }

    return randInt(5, 20); // no assignment for this standard in this window
  }

  for (let testSeq = 2; testSeq <= 6; testSeq++) {
    console.log(`    Generating PM${testSeq} scores...`);
    const prevTestSeq = testSeq - 1;

    const scoreTx = sqlite.transaction(() => {
      let count = 0;
      for (const stu of allStudents) {
        const prev = studentScores[stu.id];
        if (!prev) continue;

        const newStdScores: Record<number, number> = {};
        const newRcScores: Record<number, number> = {};

        // Apply growth to each standard
        for (let stdId = 1; stdId <= 20; stdId++) {
          const prevScore = prev.stdScores[stdId] ?? 5400;
          const growth = getGrowthForStandard(
            stu.id,
            stdId,
            prevTestSeq,
            testSeq
          );
          newStdScores[stdId] = clamp(prevScore + growth, 5100, 5800);
        }

        // Recompute RC averages from standard scores
        for (let rc = 1; rc <= 4; rc++) {
          const stds = rcToStds[rc];
          const avg = Math.round(
            stds.reduce((sum, sid) => sum + newStdScores[sid], 0) / stds.length
          );
          newRcScores[rc] = clamp(avg, 5100, 5800);
        }

        // Recompute overall from RC averages
        const overall = clamp(
          Math.round(
            (newRcScores[1] + newRcScores[2] + newRcScores[3] + newRcScores[4]) / 4
          ),
          5100,
          5800
        );
        const level = scoreToLevel(overall);

        // Update in-memory store for next PM
        studentScores[stu.id] = {
          stdScores: newStdScores,
          rcScores: newRcScores,
          overall,
          level,
        };

        insertScore.run(
          stu.id,
          testSeq, // test_id
          overall,
          level,
          JSON.stringify(newRcScores),
          JSON.stringify(newStdScores)
        );

        count++;
        if (count % 2000 === 0) {
          console.log(`      ... ${count} PM${testSeq} scores`);
        }
      }
    });
    scoreTx();
    console.log(`    ✓ ${allStudents.length} PM${testSeq} scores created`);
  }

  // Re-enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  const elapsed = Date.now() - t0;
  const totalScores = allStudents.length * 6;
  console.log(
    `\n✅ Seed complete in ${elapsed}ms: ${allStudents.length} students, ${totalScores} score records, 8 assignments`
  );
}
