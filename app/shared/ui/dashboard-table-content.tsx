import type { ReactNode } from "react";
import { useDashboardContentWidth } from "./dashboard-content-width";

type DashboardTableContentProps = {
  children: ReactNode;
  className?: string;
};

// Full-width content slot for data-table routes (no max-width cap, unlike DashboardPageContent).
export default function DashboardTableContent({
  children,
  className = "",
}: DashboardTableContentProps) {
  useDashboardContentWidth("full");

  return (
    <div className={`flex w-full flex-col gap-6 ${className}`}>{children}</div>
  );
}
