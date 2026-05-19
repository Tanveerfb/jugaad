"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, Eye, EyeOff } from "lucide-react";

interface Props {
  vars: string[];
  onSubmit: (values: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export default function EnvVarForm({ vars, onSubmit, isSubmitting }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(vars.map((v) => [v, ""])),
  );
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleVisible(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const allFilled = vars.every((v) => values[v]?.trim());

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-amber-400" />
        <span>Environment Variables Required</span>
      </div>
      <p className="text-xs text-muted-foreground">
        This project needs the following values before it can run. They will be
        saved to <code className="font-mono">.env.local</code> in your project.
      </p>
      <div className="flex flex-col gap-3">
        {vars.map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label
              htmlFor={`env-${key}`}
              className="text-xs font-mono text-muted-foreground"
            >
              {key}
            </label>
            <div className="flex gap-1">
              <input
                id={`env-${key}`}
                type={visible[key] ? "text" : "password"}
                value={values[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${key}`}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => toggleVisible(key)}
                className="rounded-md border border-border px-2 text-muted-foreground hover:text-foreground transition-colors"
                title={visible[key] ? "Hide" : "Show"}
              >
                {visible[key] ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        onClick={() => onSubmit(values)}
        disabled={!allFilled || isSubmitting}
      >
        {isSubmitting ? "Saving…" : "Save & Start Preview"}
      </Button>
    </div>
  );
}
