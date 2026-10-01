export const settingsSections = [
  {
    id: "company-information",
    label: "Company Information",
    title: "Company Information",
    description:
      "Maintain legal details, primary contacts, and location metadata that appears across documents and internal workflows.",
  },
  {
    id: "notifications",
    label: "Notifications",
    title: "Notifications",
    description:
      "Control delivery channels and event triggers for order updates, approvals, and operational alerts.",
  },
  {
    id: "account",
    label: "Account",
    title: "Account",
    description:
      "Manage security settings, authentication methods, and account-level controls for this business profile.",
  },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

export type SettingsSection = (typeof settingsSections)[number];

export function isSettingsSectionId(
  value: string | undefined,
): value is SettingsSectionId {
  return settingsSections.some((section) => section.id === value);
}

export function getSettingsSectionById(id: SettingsSectionId): SettingsSection {
  const section = settingsSections.find((item) => item.id === id);

  if (!section) {
    return settingsSections[0];
  }

  return section;
}
