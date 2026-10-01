import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Input from "~/shared/ui/form/input";
import Button from "~/shared/ui/button";
import { useNavigate } from "react-router";
import {
  dashboardPathFor,
  getLoggedInUser,
  resetDatabase,
  signInWithSeedUser,
} from "~/shared/lib/indexed-db";
import { useToast } from "~/shared/ui/toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [role, setRole] = useState<"horeca" | "supplier">("horeca");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);

  useEffect(() => {
    let isActive = true;

    void getLoggedInUser().then((user) => {
      if (isActive && user) {
        navigate(dashboardPathFor(user.role), { replace: true });
      }
    });

    return () => {
      isActive = false;
    };
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) {
      setError("Email/username and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await signInWithSeedUser(identifier, password, role);

      if (!user) {
        setError(
          "We couldn't sign you in. Please check your credentials and try again.",
        );
        return;
      }

      navigate(dashboardPathFor(user.role));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We couldn't sign you in. Please check your credentials and try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetData() {
    setError(null);
    setIsResettingData(true);

    try {
      await resetDatabase();
      showToast({
        title: "Data reset",
        description: "Your local data has been restored to its default state.",
        variant: "success",
      });
    } catch {
      showToast({
        title: "Couldn't reset data",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setIsResettingData(false);
    }
  }

  return (
    <main
      data-account-type={role}
      className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-4 py-10 text-slate-950"
    >
      <div className="relative mx-auto w-full max-w-xl">
        <a
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </a>

        <div className="w-full rounded-4xl border border-slate-200/80 bg-white p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            Sign In
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Log in to Synko
          </h2>

          <div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5">
            <button
              type="button"
              onClick={() => setRole("horeca")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${role === "horeca" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              aria-pressed={role === "horeca"}
            >
              HoReCa
            </button>
            <button
              type="button"
              onClick={() => setRole("supplier")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${role === "supplier" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              aria-pressed={role === "supplier"}
            >
              Supplier
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <input type="hidden" name="role" value={role} readOnly />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              label="Email or Username"
              labelClassName="text-slate-700"
              placeholder="john.smith or john@restaurant.am"
            />

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                labelClassName="text-slate-700"
                placeholder="••••••••"
                containerClassName="relative"
              />
            </div>

            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">Sign-in failed</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="mt-2">
              Log In
            </Button>

            <div className="mt-3 text-center">
              <a className="text-sm text-primary" href="#">
                Forgot Password?
              </a>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Need a fresh start for this browser?
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={isResettingData}
              disabled={isSubmitting}
              onClick={() => {
                void handleResetData();
              }}
              className="mt-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              Reset data
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to Synko?{" "}
          <a className="font-semibold text-[#EA580C]" href="/register-horeca">
            Register as HoReCa
          </a>{" "}
          or{" "}
          <a className="font-semibold text-[#0284C7]" href="/register-supplier">
            Register as Supplier
          </a>
        </p>
      </div>
    </main>
  );
}
