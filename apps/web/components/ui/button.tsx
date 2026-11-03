import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "success" | "ghost";
  size?: "default" | "sm" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", isLoading, children, disabled, ...props }, ref) => {
    let variantStyles = "bg-[#0F766E] text-white hover:bg-[#0D635D] active:bg-[#0B534E] dark:bg-[#0F766E] dark:hover:bg-[#118b82] shadow-xs";

    if (variant === "secondary") {
      variantStyles = "bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700 dark:hover:bg-stone-700";
    } else if (variant === "outline") {
      variantStyles = "bg-white text-stone-900 border border-stone-300 hover:bg-stone-50 active:bg-stone-100 dark:bg-[#142321] dark:text-stone-100 dark:border-stone-700 dark:hover:bg-[#1a2d2a]";
    } else if (variant === "danger") {
      variantStyles = "bg-[#B42318] text-white hover:bg-[#9B1E15] active:bg-[#831912] shadow-xs";
    } else if (variant === "success") {
      variantStyles = "bg-[#166534] text-white hover:bg-[#12532B] active:bg-[#0E4222] shadow-xs";
    } else if (variant === "ghost") {
      variantStyles = "bg-transparent text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800";
    }

    const sizeStyles =
      size === "sm"
        ? "px-3 py-1.5 text-sm min-h-[44px]"
        : size === "lg"
        ? "px-6 py-3.5 text-base font-semibold min-h-[52px]"
        : "px-4 py-2.5 text-sm font-semibold min-h-[48px]";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-xl transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0F766E]/20 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

