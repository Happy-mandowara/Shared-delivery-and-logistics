"use client";

import React, { forwardRef, useId } from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, checked, id: customId, className = "", disabled, onChange, ...props }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-3 min-h-[48px] py-1 cursor-pointer select-none group ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150
              ${
                checked
                  ? "bg-[#0F766E] border-[#0F766E] text-white shadow-xs"
                  : "bg-white dark:bg-[#142321] border-stone-300 dark:border-stone-700 group-hover:border-stone-400"
              }
              peer-focus-visible:ring-4 peer-focus-visible:ring-[#0F766E]/20
            `}
          >
            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col text-left">
            {label && (
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-stone-950">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

