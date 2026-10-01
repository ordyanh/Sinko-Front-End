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
      className={`sticky top-0 z-10 bg-[#f3f6f4]/95 py-3 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
