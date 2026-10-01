import { Switch as HeadlessSwitch } from "@headlessui/react";

export type SwitchFieldProps = {
  title: string;
  description?: string;
  checked: boolean;
  onSave: (checked: boolean) => void;
  isSubmitting?: boolean;
  size?: "sm" | "md" | "lg";
};

const trackSizeClasses: Record<
  NonNullable<SwitchFieldProps["size"]>,
  string
> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
  lg: "h-7 w-14",
};

const thumbSizeClasses: Record<
  NonNullable<SwitchFieldProps["size"]>,
  string
> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const thumbTranslateClasses: Record<
  NonNullable<SwitchFieldProps["size"]>,
  string
> = {
  sm: "group-data-[checked]:translate-x-4",
  md: "group-data-[checked]:translate-x-5",
  lg: "group-data-[checked]:translate-x-7",
};

export default function SwitchField({
  title,
  description,
  checked,
  onSave,
  isSubmitting = false,
  size = "md",
}: SwitchFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <HeadlessSwitch
        checked={checked}
        onChange={onSave}
        disabled={isSubmitting}
        className={`group relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${trackSizeClasses[size]} ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
      >
        <span
          className={`inline-block transform rounded-full bg-white shadow transition-transform duration-200 ${thumbSizeClasses[size]} ${thumbTranslateClasses[size]} translate-x-0.5`}
        />
      </HeadlessSwitch>
    </div>
  );
}
