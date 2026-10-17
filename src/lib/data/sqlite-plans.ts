import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { assertMoveTransition, assertPlanTransition, isEditable } from "@/lib/domain/plan-lifecycle";
import { planMoveSchema, planSchema, type Plan, type PlanMove } from "@/schemas/plan-schema";
import type { PlansStore } from "./types";

/** Plans and their moves, on the shared database. */
export function sqlitePlans(db: DatabaseSync): PlansStore {
  const now = () => new Date().toISOString();
  const getPlanRow = db.prepare("SELECT * FROM plans WHERE id = ?");
  const getMoveRow = db.prepare("SELECT * FROM plan_moves WHERE id = ?");

  function getPlan(id: string): Plan | null {
    const row = getPlanRow.get(id) as PlanRow | undefined;
    return row ? toPlan(row) : null;
  }

  function mustGetPlan(id: string): Plan {
    const plan = getPlan(id);
    if (!plan) throw new Error(`No plan ${id}`);
    return plan;
  }

  function mustGetMove(id: string): PlanMove {
    const row = getMoveRow.get(id) as MoveRow | undefined;
    if (!row) throw new Error(`No move ${id}`);
    return toMove(row);
  }

  function touch(planId: string): void {
    db.prepare("UPDATE plans SET updated_at = ? WHERE id = ?").run(now(), planId);
  }

  return {
    createPlan(folderId, moves) {
      const id = randomUUID();
      const at = now();
      const insertMove = db.prepare(
        `INSERT INTO plan_moves (id, plan_id, position, from_path, to_path, category, confidence, suggested_name, is_folder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO plans (id, folder_id, status, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?)").run(
          id,
          folderId,
          at,
          at,
        );
        moves.forEach((m, position) =>
          insertMove.run(randomUUID(), id, position, m.fromPath, m.toPath, m.category, m.confidence, m.suggestedName ?? null, m.isFolder ? 1 : 0),
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return mustGetPlan(id);
    },

    getPlan,

    listPlans(folderId) {
      const rows = db
        .prepare("SELECT * FROM plans WHERE folder_id = ? ORDER BY created_at DESC, rowid DESC")
        .all(folderId) as unknown as PlanRow[];
      return rows.map(toPlan);
    },

    listPlanMoves(planId) {
      const rows = db
        .prepare("SELECT * FROM plan_moves WHERE plan_id = ? ORDER BY position")
        .all(planId) as unknown as MoveRow[];
      return rows.map(toMove);
    },

    getPlanMove(moveId) {
      const row = getMoveRow.get(moveId) as MoveRow | undefined;
      return row ? toMove(row) : null;
    },

    setMoveIncluded(moveId, included) {
      const move = mustGetMove(moveId);
      const plan = mustGetPlan(move.planId);
      if (!isEditable(plan.status)) throw new Error(`Plan ${plan.id} is ${plan.status}; only drafts can be edited`);
      db.prepare("UPDATE plan_moves SET included = ? WHERE id = ?").run(included ? 1 : 0, moveId);
      touch(plan.id);
      return mustGetMove(moveId);
    },

    setMoveTarget(moveId, { toPath, rename, category }) {
      const move = mustGetMove(moveId);
      const plan = mustGetPlan(move.planId);
      if (!isEditable(plan.status)) throw new Error(`Plan ${plan.id} is ${plan.status}; only drafts can be edited`);
      db.prepare("UPDATE plan_moves SET to_path = ?, rename = ?, category = ? WHERE id = ?").run(
        toPath,
        rename ? 1 : 0,
        category,
        moveId,
      );
      touch(plan.id);
      return mustGetMove(moveId);
    },

    transitionPlan(id, to) {
      const plan = mustGetPlan(id);
      assertPlanTransition(plan.status, to);
      db.prepare("UPDATE plans SET status = ?, updated_at = ? WHERE id = ?").run(to, now(), id);
      return mustGetPlan(id);
    },

    completeMove(moveId, to) {
      const move = mustGetMove(moveId);
      assertMoveTransition(move.status, to);
      db.prepare("UPDATE plan_moves SET status = ?, error = NULL WHERE id = ?").run(to, moveId);
      touch(move.planId);
      return mustGetMove(moveId);
    },

    failMove(moveId, error) {
      const move = mustGetMove(moveId);
      db.prepare("UPDATE plan_moves SET error = ? WHERE id = ?").run(error, moveId);
      touch(move.planId);
      return mustGetMove(moveId);
    },
  };
}

type PlanRow = { id: string; folder_id: string; status: string; created_at: string; updated_at: string };

type MoveRow = {
  id: string;
  plan_id: string;
  from_path: string;
  to_path: string;
  included: number;
  category: string | null;
  confidence: number | null;
  suggested_name: string | null;
  rename: number;
  is_folder: number;
  status: string;
  error: string | null;
};

function toPlan(row: PlanRow): Plan {
  return planSchema.parse({
    id: row.id,
    folderId: row.folder_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toMove(row: MoveRow): PlanMove {
  return planMoveSchema.parse({
    id: row.id,
    planId: row.plan_id,
    fromPath: row.from_path,
    toPath: row.to_path,
    included: row.included === 1,
    category: row.category,
    confidence: row.confidence,
    suggestedName: row.suggested_name,
    rename: row.rename === 1,
    isFolder: row.is_folder === 1,
    status: row.status,
    error: row.error,
  });
}
