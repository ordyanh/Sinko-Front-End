import { createContext, useContext, useEffect, type ReactNode } from "react";

export type DashboardHeaderActionContent = {
  back?: ReactNode;
  actions?: ReactNode;
  /** Changes when an action needs fresh page-state closures. */
  refreshKey?: string | number;
};

export const DashboardHeaderActionsContext = createContext<
  (content: DashboardHeaderActionContent | null) => void
>(() => undefined);

type DashboardHeaderActionsProps = DashboardHeaderActionContent;

// Registers route-specific controls with the dashboard's persistent header.
export default function DashboardHeaderActions({
  back,
  actions,
  refreshKey,
}: DashboardHeaderActionsProps) {
  const setHeaderActions = useContext(DashboardHeaderActionsContext);

  useEffect(() => {
    setHeaderActions({ back, actions });

    return () => setHeaderActions(null);
  // Persistent headers otherwise retain the first action element and its stale
  // closures. `refreshKey` updates it without causing a render loop from fresh
  // ReactNode identities on every page render.
  }, [setHeaderActions, refreshKey]);

  return null;
}
