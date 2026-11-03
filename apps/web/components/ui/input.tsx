"use client";

import React, { forwardRef, useId } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
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

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1 select-none"
          >
            {label}
            {required && <span className="text-[#B42318] text-sm leading-none">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={`
              w-full min-h-[48px] px-3.5 py-2.5 text-base sm:text-sm font-medium rounded-xl border transition-all duration-150
              bg-white dark:bg-[#142321] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500
              ${leftIcon ? "pl-11" : ""}
              ${rightIcon || hasError || success ? "pr-11" : ""}
              ${
                hasError
                  ? "border-[#B42318] focus:border-[#B42318] focus:ring-4 focus:ring-[#B42318]/15 bg-red-50/20"
                  : success
                  ? "border-[#166534] focus:border-[#166534] focus:ring-4 focus:ring-[#166534]/15"
                  : "border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 focus:border-[#0F766E] dark:focus:border-[#34B8AB] focus:ring-4 focus:ring-[#0F766E]/15"
              }
              ${disabled ? "opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-900" : ""}
              ${className}
            `}
            {...props}
          />

          <div className="absolute right-3.5 flex items-center pointer-events-none">
            {hasError ? (
              <AlertCircle className="w-5 h-5 text-[#B42318]" aria-hidden="true" />
            ) : success ? (
              <CheckCircle2 className="w-5 h-5 text-[#166534]" aria-hidden="true" />
            ) : (
              rightIcon
            )}
          </div>
        </div>

        {hasError ? (
          <p id={errorId} role="alert" className="text-xs font-semibold text-[#B42318] flex items-center gap-1 mt-0.5">
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

Input.displayName = "Input";

