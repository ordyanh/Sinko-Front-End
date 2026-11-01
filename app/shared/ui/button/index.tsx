import React from "react";
import { Button as HeadlessButton } from "@headlessui/react";
import { LoaderCircle } from "lucide-react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  loading?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3.5 text-xs font-semibold rounded-xl",
  md: "h-11 px-5 text-sm font-semibold rounded-xl",
  lg: "h-12 px-7 text-base font-semibold rounded-xl",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      children,
      loading = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <HeadlessButton
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={isDisabled}
        aria-busy={loading}
        className={`inline-flex w-full items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${isDisabled ? "cursor-not-allowed opacity-65" : ""}`}
        {...props}
      >
        {loading ? (
          <>
            <LoaderCircle
              className="mr-2 h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span>{children ?? "Loading..."}</span>
          </>
        ) : (
          children
        )}
      </HeadlessButton>
    );
  },
);

Button.displayName = "Button";

export default Button;
