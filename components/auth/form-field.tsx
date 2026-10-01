"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps
  extends Omit<React.ComponentProps<"input">, "id"> {
  id: string;
  label: string;
  /** Inline validation message. Also drives `aria-invalid` on the control. */
  error?: string;
  /** Persistent helper text, e.g. password requirements. */
  description?: string;
}

/**
 * A labelled input with wired-up description/error text.
 *
 * The label, helper text and error message are always connected through
 * `aria-describedby`, so assistive technology reads the requirement or the
 * failure together with the field itself.
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, description, className, ...inputProps }, ref) => {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = cn(descriptionId, errorId) || undefined;

    return (
      <div className="flex flex-col gap-2" data-invalid={error ? "" : undefined}>
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          ref={ref}
          className={className}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
