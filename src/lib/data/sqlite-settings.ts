import type { DatabaseSync } from "node:sqlite";
import { modelChoicesSchema } from "@/schemas/settings-schema";
import type { SettingsStore } from "./types";

const MODEL_CHOICES = "model-choices";

/** The owner's settings and the ledger of models Jugaad loaded, on the shared database. */
export function sqliteSettings(db: DatabaseSync): SettingsStore {
  return {
    getModelChoices() {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(MODEL_CHOICES) as { value: string } | undefined;
      if (!row) return {};
      // a stored value that no longer parses is ignored rather than stopping every job
      const parsed = modelChoicesSchema.safeParse(JSON.parse(row.value));
      return parsed.success ? parsed.data : {};
    },

    setModelChoices(choices) {
      const value = JSON.stringify(modelChoicesSchema.parse(choices));
      db.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ).run(MODEL_CHOICES, value, new Date().toISOString());
    },

    listJugaadModels() {
      return (db.prepare("SELECT name FROM jugaad_models ORDER BY loaded_at").all() as { name: string }[]).map((r) => r.name);
    },

    markModelLoaded(name) {
      db.prepare("INSERT INTO jugaad_models (name, loaded_at) VALUES (?, ?) ON CONFLICT (name) DO NOTHING").run(
        name,
        new Date().toISOString(),
      );
    },

    markModelReleased(name) {
      db.prepare("DELETE FROM jugaad_models WHERE name = ?").run(name);
    },
  };
}
