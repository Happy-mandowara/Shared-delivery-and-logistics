import React from "react";

export type BadgeVariant = "default" | "teal" | "success" | "warning" | "danger" | "neutral" | "outline";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
  className = "",
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    teal: "bg-teal-50 text-[#0F766E] border-teal-200 dark:bg-teal-950/50 dark:text-[#34B8AB] dark:border-teal-800",
    success: "bg-emerald-50 text-[#166534] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    warning: "bg-amber-50 text-[#92400E] border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    danger: "bg-red-50 text-[#B42318] border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    neutral: "bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800",
    outline: "bg-transparent text-stone-700 border-stone-300 dark:text-stone-300 dark:border-stone-700",
  };

  const sizes: Record<BadgeSize, string> = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border leading-none tracking-wide select-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

