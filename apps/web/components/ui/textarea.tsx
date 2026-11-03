"use client";

import React, { forwardRef, useId } from "react";
import { AlertCircle } from "lucide-react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      maxLength,
      value,
      id: customId,
      className = "",
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = Boolean(error);
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1 select-none"
            >
              {label}
              {required && <span className="text-[#B42318] text-sm leading-none">*</span>}
            </label>
          )}
          {maxLength && (
            <span className="text-[11px] font-mono text-stone-400">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={`
            w-full min-h-[96px] px-3.5 py-2.5 text-base sm:text-sm font-medium rounded-xl border transition-all duration-150 resize-y
            bg-white dark:bg-[#142321] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500
            ${
              hasError
                ? "border-[#B42318] focus:border-[#B42318] focus:ring-4 focus:ring-[#B42318]/15 bg-red-50/20"
                : "border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 focus:border-[#0F766E] dark:focus:border-[#34B8AB] focus:ring-4 focus:ring-[#0F766E]/15"
            }
            ${disabled ? "opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-900" : ""}
            ${className}
          `}
          {...props}
        />

        {hasError ? (
          <p id={errorId} role="alert" className="text-xs font-semibold text-[#B42318] flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

