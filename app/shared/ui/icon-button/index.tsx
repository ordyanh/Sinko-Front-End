import React from "react";
import { Button as HeadlessButton } from "@headlessui/react";
import { LoaderCircle } from "lucide-react";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

const variantClasses: Record<
  NonNullable<IconButtonProps["variant"]>,
  string
> = {
  default: "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
  primary: "text-primary hover:bg-primary/10",
  danger: "text-error hover:bg-error/10",
};

const sizeClasses: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = "default",
      size = "md",
      className = "",
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
        type="button"
        aria-label={label}
        title={label}
        disabled={isDisabled}
        aria-busy={loading}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${sizeClasses[size]} ${variantClasses[variant]} ${
          isDisabled ? "pointer-events-none opacity-40" : ""
        } ${className}`}
        {...props}
      >
        {loading ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
      </HeadlessButton>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
