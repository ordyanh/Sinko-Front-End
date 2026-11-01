import type { ReactNode } from "react";

type DashboardPageHeaderProps = {
  children: ReactNode;
  className?: string;
};

// Keeps page navigation and primary actions available within the dashboard content scroller.
export default function DashboardPageHeader({
  children,
  className = "",
}: DashboardPageHeaderProps) {
  return (
    <div
      className={`relative sm:sticky sm:top-0 z-10 bg-slate-50/95 dark:bg-[#0b0f17]/95 py-3 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
