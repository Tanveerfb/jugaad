"use client";

import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { Button } from "@/components/ui/button";
import { Edit2, CheckCircle, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectPlan } from "@/types";

type PlanSummaryProps = {
  onEdit: () => void;
  onStartOver: () => void;
  onConfirm: () => void;
  autoRun: boolean;
  onToggleAutoRun: () => void;
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

export default function PlanSummary({
  onEdit,
  onStartOver,
  onConfirm,
  autoRun,
  onToggleAutoRun,
}: PlanSummaryProps) {
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

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartOver}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Start Over
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Plan
          </Button>
          <button
            type="button"
            onClick={onToggleAutoRun}
            title={
              autoRun
                ? "Autopilot on — build will start automatically"
                : "Enable autopilot — build starts automatically after tasks generate"
            }
            className={cn(
              "h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors",
              autoRun
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
            )}
          >
            <Zap className={cn("h-3 w-3", autoRun && "fill-primary")} />
            Autopilot
          </button>
          <Button size="sm" onClick={onConfirm}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Confirm &amp; Generate Tasks
          </Button>
        </div>
      </div>
    </div>
  );
}
