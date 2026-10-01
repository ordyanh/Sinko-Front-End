import type { ReactNode } from "react";
import { useDashboardContentWidth } from "./dashboard-content-width";

type DashboardPageContentProps = {
  children: ReactNode;
  className?: string;
};

// Reading-width content slot (mirrors the previous DashboardLayout <main> constraint) for settings/placeholder routes.
export default function DashboardPageContent({
  children,
  className = "",
}: DashboardPageContentProps) {
  useDashboardContentWidth("reading");

  return (
    <div className={`mx-auto w-full max-w-7xl ${className}`}>{children}</div>
  );
}
