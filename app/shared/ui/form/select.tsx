import React, { useMemo, useState } from "react";
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export type SelectProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "size" | "value" | "onChange"
> & {
  variant?: "default" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  error?: boolean;
  multiple?: boolean;
  /** Lets people search existing options and add their search as a new option. */
  creatable?: boolean;
  createLabel?: (value: string) => string;
  onValueChange?: (values: string | string[]) => void;
  value?: string | string[];
};

type SelectOption = {
  value: string;
  label: React.ReactNode;
};

const sizeClasses: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-5 py-4 text-lg",
};

const variantClasses: Record<NonNullable<SelectProps["variant"]>, string> = {
  default:
    "border-base-300/80 bg-white text-base-content shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-base-300",
  ghost: "bg-transparent border-transparent",
};

const parseOptions = (children: React.ReactNode): SelectOption[] => {
  return React.Children.toArray(children)
    .map((child) => {
      if (
        !React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(
          child,
        )
      ) {
        return null;
      }

      const value = child.props.value ?? child.props.children;
      const label = child.props.children ?? String(value);

      return {
        value: String(value),
        label,
      };
    })
    .filter(Boolean) as SelectOption[];
};

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      variant = "default",
      size = "md",
      className = "",
      error,
      multiple,
      creatable = false,
      createLabel = (nextValue) => `Add \"${nextValue}\"`,
      onValueChange,
      value,
      children,
      disabled,
      id,
      name,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const options = parseOptions(children);
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim();
    const visibleOptions = useMemo(() => {
      if (!creatable || !normalizedQuery) return options;

      return options.filter((option) =>
        String(option.label).toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()),
      );
    }, [creatable, normalizedQuery, options]);
    const canCreate =
      creatable &&
      normalizedQuery.length > 0 &&
      !options.some(
        (option) => option.value.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase(),
      );
    const selectedValue = multiple
      ? Array.isArray(value)
        ? value
        : []
      : typeof value === "string"
        ? value
        : undefined;

    const handleChange = (nextValue: string | string[]) => {
      onValueChange?.(nextValue);
      setQuery("");
    };

    const handleCreate = () => {
      if (!canCreate) return;

      if (multiple) {
        const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
        handleChange([...new Set([...currentValues, normalizedQuery])]);
        return;
      }

      handleChange(normalizedQuery);
    };

    const renderButtonLabel = () => {
      if (
        multiple &&
        Array.isArray(selectedValue) &&
        selectedValue.length > 0
      ) {
        return (
          <span className="flex flex-wrap gap-2">
            {selectedValue.map((item) => {
              const option = options.find(
                (currentOption) => currentOption.value === item,
              );
              return (
                <span
                  key={item}
                  className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-sm font-medium text-base-content"
                >
                  {option?.label ?? item}
                </span>
              );
            })}
          </span>
        );
      }

      if (typeof selectedValue === "string") {
        const option = options.find(
          (currentOption) => currentOption.value === selectedValue,
        );
        return <span>{option?.label ?? selectedValue}</span>;
      }

      return <span className="text-base-content/45">Select an option...</span>;
    };

    return (
      <div className={`relative ${className}`}>
        <Listbox
          value={selectedValue}
          onChange={handleChange}
          multiple={multiple}
          disabled={disabled}
        >
          <Listbox.Button
            ref={ref as React.Ref<HTMLButtonElement>}
            id={id}
            name={name}
            type={type}
            className={`w-full rounded-xl border pr-10 text-left transition-[border-color,box-shadow,background-color,color] duration-200 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:border-base-300/70 disabled:bg-base-200/40 disabled:text-base-content/40 ${sizeClasses[size]} ${variantClasses[variant]} ${error ? "border-error bg-error/10 focus-visible:border-error focus-visible:ring-error/20" : "focus-visible:border-primary focus-visible:ring-primary/20"}`}
            aria-invalid={error ? "true" : "false"}
            {...props}
          >
            {renderButtonLabel()}
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
              aria-hidden="true"
            />
          </Listbox.Button>

          <Listbox.Options
            anchor={{ to: "bottom start", gap: "0.5rem", padding: "0.75rem" }}
            // Render above the dialog's clipping boundary. `anchor` flips the
            // panel above its trigger when there is not enough viewport space.
            modal={false}
            portal
            className="z-[60] max-h-64 w-(--button-width) overflow-y-auto rounded-2xl border border-base-300/90 bg-white p-2 shadow-xl shadow-slate-900/10"
          >
            {creatable ? (
              <div className="sticky top-0 z-10 bg-white pb-2">
                <input
                  aria-label="Search or add an option"
                  autoFocus
                  className="w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter" && canCreate) {
                      event.preventDefault();
                      handleCreate();
                    }
                  }}
                  placeholder="Search or add an option"
                  value={query}
                />
              </div>
            ) : null}
            {canCreate ? (
              <Listbox.Option
                className={({ active }) =>
                  `mb-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition ${active ? "bg-primary/10" : ""}`
                }
                value={normalizedQuery}
              >
                {createLabel(normalizedQuery)}
              </Listbox.Option>
            ) : null}
            {visibleOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active, selected }) =>
                  `cursor-pointer rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-base-200/80" : ""} ${selected ? "font-semibold text-primary" : "text-base-content"}`
                }
              >
                {({ selected }) => (
                  <span className="flex items-center justify-between gap-3">
                    <span>{option.label}</span>
                    {selected ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Listbox>
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
