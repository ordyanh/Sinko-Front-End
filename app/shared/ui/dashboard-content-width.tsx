import { createContext, useContext, useEffect } from "react";

export type DashboardContentWidth = "full" | "reading";

export const DashboardContentWidthContext = createContext<
  (width: DashboardContentWidth) => void
>(() => undefined);

export function useDashboardContentWidth(width: DashboardContentWidth) {
  const setContentWidth = useContext(DashboardContentWidthContext);

  useEffect(() => {
    setContentWidth(width);

    return () => setContentWidth("full");
  }, [setContentWidth, width]);
}
