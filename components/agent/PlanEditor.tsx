"use client";

import { useState } from "react";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feature, Page, DataModel, ProjectPlan } from "@/types";

type PlanEditorProps = {
  onSave: () => void;
  onCancel: () => void;
};

const FIELD_TYPES = [
  "string",
  "number",
  "boolean",
  "Date",
  "string[]",
  "number[]",
  "object",
];

const AUTH_OPTIONS: { value: ProjectPlan["authStrategy"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "nextauth", label: "NextAuth.js" },
  { value: "clerk", label: "Clerk" },
  { value: "firebase", label: "Firebase Auth" },
  { value: "custom", label: "Custom" },
];

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {label && (
        <span className="text-xs text-muted-foreground shrink-0 w-14 text-right">
          {label}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring",
          mono && "font-mono",
        )}
      />
    </div>
  );
}

function SectionHeader({
  title,
  count,
  onAdd,
  addLabel,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
        <span className="ml-1.5 text-muted-foreground/50 normal-case tracking-normal font-normal">
          ({count})
        </span>
      </h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    </div>
  );
}

export default function PlanEditor({ onSave, onCancel }: PlanEditorProps) {
  const plan = useProjectPlanStore((s) => s.plan) as ProjectPlan;
  const updatePlan = useProjectPlanStore((s) => s.updatePlan);

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [authStrategy, setAuthStrategy] = useState<ProjectPlan["authStrategy"]>(
    plan.authStrategy,
  );
  const [features, setFeatures] = useState<Feature[]>(plan.features);
  const [pages, setPages] = useState<Page[]>(plan.pages);
  const [dataModels, setDataModels] = useState<DataModel[]>(plan.dataModels);

  function handleSave() {
    updatePlan({
      name: name.trim() || plan.name,
      description,
      authStrategy,
      features: features.filter((f) => f.title.trim()),
      pages: pages.filter((p) => p.name.trim() && p.route.trim()),
      dataModels: dataModels.filter((m) => m.name.trim()),
      updatedAt: Date.now(),
    });
    onSave();
  }

  // ── Feature handlers ─────────────────────────────────────────
  function addFeature() {
    setFeatures((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", description: "" },
    ]);
  }
  function removeFeature(id: string) {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  }
  function updateFeature(id: string, patch: Partial<Feature>) {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  // ── Page handlers ────────────────────────────────────────────
  function addPage() {
    setPages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", route: "/", description: "" },
    ]);
  }
  function removePage(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }
  function updatePage(id: string, patch: Partial<Page>) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // ── Data model handlers ──────────────────────────────────────
  function addModel() {
    setDataModels((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", fields: [] },
    ]);
  }
  function removeModel(id: string) {
    setDataModels((prev) => prev.filter((m) => m.id !== id));
  }
  function updateModelName(id: string, newName: string) {
    setDataModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: newName } : m)),
    );
  }
  function addField(modelId: string) {
    setDataModels((prev) =>
      prev.map((m) =>
        m.id === modelId
          ? {
              ...m,
              fields: [
                ...m.fields,
                { name: "", type: "string", required: true },
              ],
            }
          : m,
      ),
    );
  }
  function removeField(modelId: string, idx: number) {
    setDataModels((prev) =>
      prev.map((m) =>
        m.id === modelId
          ? { ...m, fields: m.fields.filter((_, i) => i !== idx) }
          : m,
      ),
    );
  }
  function updateField(
    modelId: string,
    idx: number,
    patch: { name?: string; type?: string; required?: boolean },
  ) {
    setDataModels((prev) =>
      prev.map((m) =>
        m.id === modelId
          ? {
              ...m,
              fields: m.fields.map((f, i) =>
                i === idx ? { ...f, ...patch } : f,
              ),
            }
          : m,
      ),
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Edit Plan
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto max-h-[55vh] p-5 space-y-6">
        {/* Name & Description */}
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Project description"
            rows={2}
            className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Auth Strategy */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Auth Strategy
          </h3>
          <div className="relative inline-block">
            <select
              value={authStrategy}
              onChange={(e) =>
                setAuthStrategy(e.target.value as ProjectPlan["authStrategy"])
              }
              className="appearance-none bg-background border border-input rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {AUTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <SectionHeader
            title="Features"
            count={features.length}
            onAdd={addFeature}
            addLabel="Add feature"
          />
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f.id} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                  <input
                    type="text"
                    value={f.title}
                    onChange={(e) =>
                      updateFeature(f.id, { title: e.target.value })
                    }
                    placeholder="Feature title"
                    className="bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={f.description}
                    onChange={(e) =>
                      updateFeature(f.id, { description: e.target.value })
                    }
                    placeholder="Brief description (optional)"
                    className="bg-background border border-input rounded px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFeature(f.id)}
                  className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  title="Remove feature"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {features.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No features yet.
              </p>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-2">
          <SectionHeader
            title="Pages"
            count={pages.length}
            onAdd={addPage}
            addLabel="Add page"
          />
          <div className="space-y-2">
            {pages.map((p) => (
              <div key={p.id} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePage(p.id, { name: e.target.value })}
                    placeholder="Page name"
                    className="bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={p.route}
                    onChange={(e) =>
                      updatePage(p.id, { route: e.target.value })
                    }
                    placeholder="/route"
                    className="bg-background border border-input rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={p.description}
                    onChange={(e) =>
                      updatePage(p.id, { description: e.target.value })
                    }
                    placeholder="Description (optional)"
                    className="bg-background border border-input rounded px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePage(p.id)}
                  className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  title="Remove page"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {pages.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No pages yet.
              </p>
            )}
          </div>
        </div>

        {/* Data Models */}
        <div className="space-y-2">
          <SectionHeader
            title="Data Models"
            count={dataModels.length}
            onAdd={addModel}
            addLabel="Add model"
          />
          <div className="space-y-3">
            {dataModels.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-background/50 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateModelName(m.id, e.target.value)}
                    placeholder="Model name (e.g. User)"
                    className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => addField(m.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    Field
                  </button>
                  <button
                    type="button"
                    onClick={() => removeModel(m.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove model"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {m.fields.length > 0 && (
                  <div className="space-y-1.5 pl-2 border-l border-border">
                    {m.fields.map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            updateField(m.id, idx, { name: e.target.value })
                          }
                          placeholder="fieldName"
                          className="flex-1 min-w-0 bg-background border border-input rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <div className="relative shrink-0">
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(m.id, idx, { type: e.target.value })
                            }
                            className="appearance-none bg-background border border-input rounded pl-2 pr-6 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        </div>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(m.id, idx, {
                                required: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          req
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(m.id, idx)}
                          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Remove field"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {dataModels.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No data models yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
