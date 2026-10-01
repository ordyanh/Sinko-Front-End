import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/_index";
import { dashboardPathFor, getLoggedInUser } from "~/shared/lib/indexed-db";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Synko — Connect HoReCa with trusted suppliers" },
    {
      name: "description",
      content:
        "Synko is the procurement platform for restaurants, cafes, and hotels in Yerevan. Source fresh produce, beverages, packaging, and more from trusted suppliers.",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 py-4 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-600 text-lg font-semibold text-white">
              S
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Synko
              </p>
              <p className="text-sm text-slate-500">
                B2B marketplace · Yerevan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/login"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Log In
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              B2B Marketplace · Yerevan
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Connect your <span className="text-emerald-600">HoReCa</span> with
              trusted suppliers
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Synko is the procurement platform for restaurants, cafes, and
              hotels across Yerevan. Source fresh produce, beverages, packaging,
              and more — all in one place.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                Log In
              </a>
              <a
                href="/register-horeca"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Register as HoReCa
              </a>
              <a
                href="/register-supplier"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Register as Supplier
              </a>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl font-semibold text-slate-950">80+</p>
                <p className="mt-2 text-sm text-slate-500">
                  Verified suppliers
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl font-semibold text-slate-950">350+</p>
                <p className="mt-2 text-sm text-slate-500">HoReCa businesses</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl font-semibold text-slate-950">12</p>
                <p className="mt-2 text-sm text-slate-500">Yerevan districts</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl font-semibold text-slate-950">99%</p>
                <p className="mt-2 text-sm text-slate-500">Order accuracy</p>
              </div>
            </div>
          </div>

          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/5">
            <div className="rounded-4xl bg-emerald-600/5 p-6 text-emerald-700">
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-700/80">
                Synko benefits
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                A smarter supply experience for your business
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Keep orders aligned, choose trusted vendors, and move from
                manual sourcing to a modern procurement workflow.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  Fresh local sourcing
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Discover the best produce, drinks, and supplies from vetted
                  Yerevan suppliers.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  Fast supplier matches
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Get paired with reliable vendors who can deliver where and
                  when you need them.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">
                  Transparent ordering
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Track order accuracy, approvals, and delivery details from a
                  single dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
