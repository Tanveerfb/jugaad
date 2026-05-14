"use client";

import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { Button } from "@/components/ui/button";
import { Edit2, CheckCircle } from "lucide-react";
import type { ProjectPlan } from "@/types";

type PlanSummaryProps = {
  onEdit: () => void;
  onConfirm: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function PlanSummary({ onEdit, onConfirm }: PlanSummaryProps) {
  const plan = useProjectPlanStore((s) => s.plan) as ProjectPlan;

  if (!plan) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {plan.description}
        </p>
      </div>

      <Section title="Auth Strategy">
        <span className="text-sm capitalize">{plan.authStrategy}</span>
      </Section>

      {plan.features.length > 0 && (
        <Section title="Features">
          <ul className="space-y-1">
            {plan.features.map((f) => (
              <li key={f.id} className="text-sm">
                <span className="font-medium">{f.title}</span>
                {f.description && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {f.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {plan.pages.length > 0 && (
        <Section title="Pages">
          <ul className="space-y-1">
            {plan.pages.map((p) => (
              <li key={p.id} className="text-sm flex gap-2">
                <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">
                  {p.route}
                </code>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {plan.dataModels.length > 0 && (
        <Section title="Data Models">
          <ul className="space-y-1">
            {plan.dataModels.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ({m.fields.length} fields)
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Confirm & Generate Tasks
        </Button>
      </div>
    </div>
  );
}
