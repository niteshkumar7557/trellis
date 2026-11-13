// The student's goal per subject (student_goals, migration 0008).

import type { SubjectId } from "@shared/types";
import type { PoolClient } from "pg";
import pool from "../db/index.js";

export interface StudentGoal {
  subjectId: SubjectId;
  goalId: string;
  since: string;
}

interface GoalRow {
  subject_id: SubjectId;
  goal_id: string;
  since: Date;
}

const toGoal = (row: GoalRow): StudentGoal => ({
  subjectId: row.subject_id,
  goalId: row.goal_id,
  since: row.since.toISOString(),
});

/**
 * Sets the goal for one subject, replacing the old one.
 *
 * `since` is when the student chose THIS goal. Picking the same goal again keeps the old
 * date: nothing changed, and "goal since" should not jump forward because a button was
 * pressed twice. ON CONFLICT turns "insert, or update if a row exists" into one statement,
 * so two quick requests can't race into a duplicate-key error.
 */
export async function setGoal(userId: number, subjectId: SubjectId, goalId: string): Promise<StudentGoal> {
  const { rows } = await pool.query<GoalRow>(
    `INSERT INTO student_goals (user_id, subject_id, goal_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, subject_id) DO UPDATE
       SET goal_id = EXCLUDED.goal_id,
           since   = CASE WHEN student_goals.goal_id = EXCLUDED.goal_id
                          THEN student_goals.since ELSE NOW() END
     RETURNING subject_id, goal_id, since`,
    [userId, subjectId, goalId],
  );
  return toGoal(rows[0]!);
}

/** Every goal the student has, oldest choice first. */
export async function listGoals(userId: number, db: Pick<PoolClient, "query"> = pool): Promise<StudentGoal[]> {
  const { rows } = await db.query<GoalRow>(
    "SELECT subject_id, goal_id, since FROM student_goals WHERE user_id = $1 ORDER BY since, subject_id",
    [userId],
  );
  return rows.map(toGoal);
}
