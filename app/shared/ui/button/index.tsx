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
  sm: "px-3 py-1.5 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
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
        className={`inline-flex w-full items-center justify-center rounded-md font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
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
