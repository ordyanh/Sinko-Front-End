import { useState, useEffect } from "react";
import { Server, Globe, CheckCircle2, XCircle, RefreshCw, X, Laptop } from "lucide-react";

export function BackendEnvironmentBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [localCoreUp, setLocalCoreUp] = useState<boolean | null>(null);
  const [localAuthUp, setLocalAuthUp] = useState<boolean | null>(null);

  // Check if Vite or client environment is configured for local
  const isLocalTarget =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_BACKEND_TARGET || "local").toLowerCase() === "local"
      : true;

  const authUrl = isLocalTarget
    ? import.meta.env?.VITE_LOCAL_AUTH_URL || "http://localhost:5273/"
    : import.meta.env?.VITE_REMOTE_AUTH_URL || "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";

  const coreUrl = isLocalTarget
    ? import.meta.env?.VITE_LOCAL_CORE_URL || "http://localhost:5206/"
    : import.meta.env?.VITE_REMOTE_CORE_URL || "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

  async function checkHealth() {
    setIsChecking(true);
    try {
      const resCore = await fetch("/api/Dictionary/units", { signal: AbortSignal.timeout(3000) });
      setLocalCoreUp(resCore.ok);
    } catch {
      setLocalCoreUp(false);
    }

    try {
      const resAuth = await fetch("/api/Employee/positions", { signal: AbortSignal.timeout(3000) });
      setLocalAuthUp(resAuth.ok);
    } catch {
      setLocalAuthUp(false);
    }
    setIsChecking(false);
  }

  useEffect(() => {
    if (isOpen) {
      void checkHealth();
    }
  }, [isOpen]);

  // Only render in dev environment
  if (typeof import.meta === "undefined" || !import.meta.env?.DEV) {
    return null;
  }

  return (
    <aside
      aria-label="Backend Target Indicator"
      className="fixed bottom-4 right-4 z-9999 font-sans text-xs select-none"
    >
      {/* Floating Pill Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border transition-all duration-200 cursor-pointer ${
            isLocalTarget
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900"
              : "bg-slate-900/90 text-sky-300 border-sky-500/40 hover:bg-slate-800"
          }`}
          title="Click to view backend connection details and switch host"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLocalTarget ? "bg-emerald-400" : "bg-sky-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLocalTarget ? "bg-emerald-500" : "bg-sky-500"
              }`}
            />
          </span>
          <span className="font-semibold tracking-wide flex items-center gap-1.5">
            {isLocalTarget ? (
              <>
                <Laptop className="w-3.5 h-3.5" />
                Backend: Local (5206 / 5273)
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                Backend: Remote (Azure)
              </>
            )}
          </span>
        </button>
      )}

      {/* Expanded Modal / Popover */}
      {isOpen && (
        <div className="w-80 rounded-2xl bg-slate-900/95 text-slate-100 border border-slate-700 shadow-2xl p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-white">Backend Environment</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white rounded-md p-1 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-slate-400">Current Target</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-md ${
                  isLocalTarget
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                {isLocalTarget ? "LOCAL (C:\\Src\\Horeca)" : "REMOTE (Azure)"}
              </span>
            </div>

            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 space-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Core Service (Sinko):</span>
                <span className="font-mono text-slate-200 break-all">{coreUrl}</span>
              </div>
              <div className="pt-1 border-t border-slate-700/40">
                <span className="text-slate-400 block font-medium">Auth Service:</span>
                <span className="font-mono text-slate-200 break-all">{authUrl}</span>
              </div>
            </div>

            {/* Health status */}
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                Proxy Connection:
                {isChecking ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                ) : localCoreUp && localAuthUp ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </span>
              <button
                onClick={() => void checkHealth()}
                disabled={isChecking}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Re-check
              </button>
            </div>

            {/* Switch instructions */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <span className="font-semibold text-slate-200 block">How to switch backend host:</span>
              <div className="space-y-1 font-mono text-[10px]">
                <div className="bg-slate-900 px-2 py-1 rounded text-emerald-300 border border-slate-800">
                  npm run use:local
                </div>
                <div className="bg-slate-900 px-2 py-1 rounded text-sky-300 border border-slate-800">
                  npm run use:remote
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Local C# code: <span className="text-slate-300 font-mono">C:\Src\Horeca</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
