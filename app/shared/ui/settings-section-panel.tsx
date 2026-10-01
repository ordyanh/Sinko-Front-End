import type { SettingsSection } from "~/shared/lib/settings-sections";

type SettingsSectionPanelProps = {
  section: SettingsSection;
};

export default function SettingsSectionPanel({
  section,
}: SettingsSectionPanelProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {section.title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {section.description}
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Section Preview
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This section now uses route-based rendering. You can continue building
          this area with forms, lists, and actions specific to{" "}
          {section.label.toLowerCase()}.
        </p>
      </div>
    </section>
  );
}
