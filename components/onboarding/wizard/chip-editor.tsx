"use client";

/** Editable skill chips used by the resume parse result. */

import * as React from "react";
import { X, Plus } from "lucide-react";

export interface ChipEditorProps {
  chips: string[];
  onChange: (chips: string[]) => void;
}

export function ChipEditor({ chips, onChange }: ChipEditorProps) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const value = draft.trim();
    if (value === "" || chips.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...chips, value]);
    setDraft("");
  };

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs">
              {chip}
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                onClick={() => onChange(chips.filter((item) => item !== chip))}
                className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          </li>
        ))}
        {chips.length === 0 ? (
          <li className="text-xs text-muted-foreground">No skills yet — add one below.</li>
        ) : null}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill"
          className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2"
        />
        <button
          type="button"
          onClick={add}
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-lory-blue hover:text-foreground"
          aria-label="Add skill"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
