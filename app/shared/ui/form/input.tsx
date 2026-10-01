import React from "react";
import { Input as HeadlessInput } from "@headlessui/react";
import { Eye, EyeOff } from "lucide-react";
import FieldError from "./field-error";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  variant?: "default" | "ghost";
  size?: "sm" | "md" | "lg";
  error?: boolean;
  errorMessage?: string;
  label?: React.ReactNode;
  labelClassName?: string;
  containerClassName?: string;
  className?: string;
};

const sizeClasses: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-12 px-4 text-base",
  lg: "h-14 px-4 text-lg",
};

const variantClasses: Record<NonNullable<InputProps["variant"]>, string> = {
  default:
    "border-slate-200 bg-white text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-slate-300",
  ghost: "bg-transparent border-transparent",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
      size = "md",
      error = false,
      errorMessage,
      label,
      labelClassName = "",
      containerClassName = "",
      className = "",
      id,
      type,
      ...props
    },
    ref,
  ) => {
    const isAriaInvalid =
      props["aria-invalid"] === true || props["aria-invalid"] === "true";
    const isInvalid = error || Boolean(errorMessage) || isAriaInvalid;
    const isPassword = type === "password";
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

    const stateClasses = isInvalid
      ? "border-red-400 bg-red-50/40 text-red-950 placeholder:text-red-300 focus-visible:border-red-500 focus-visible:ring-red-200"
      : "focus-visible:border-emerald-500 focus-visible:ring-emerald-100";

    return (
      <div className={containerClassName}>
        {label ? (
          <label
            htmlFor={id}
            className={`mb-2 block text-sm font-medium text-slate-900 ${labelClassName}`.trim()}
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <HeadlessInput
            id={id}
            ref={ref as React.Ref<HTMLInputElement>}
            type={isPassword && isPasswordVisible ? "text" : type}
            aria-invalid={
              isInvalid ? "true" : (props["aria-invalid"] ?? "false")
            }
            className={`block w-full rounded-xl border placeholder:text-slate-400 transition-[border-color,box-shadow,background-color,color] duration-200 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${sizeClasses[size]} ${variantClasses[variant]} ${stateClasses} ${isPassword ? "pr-11" : ""} ${className}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setIsPasswordVisible((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {isPasswordVisible ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
        <FieldError message={errorMessage} />
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
