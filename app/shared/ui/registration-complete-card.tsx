import { MailCheck } from "lucide-react";

type RegistrationCompleteCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  notice: string;
  registeredEmail?: string;
};

export default function RegistrationCompleteCard({
  eyebrow,
  title,
  description,
  notice,
  registeredEmail,
}: RegistrationCompleteCardProps) {
  return (
    <div className="rounded-4xl border border-emerald-200 bg-white/95 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-sm sm:p-9">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {description}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>

          <p className="text-sm text-slate-600">
            We sent a confirmation to {registeredEmail || "your email"}. You can
            close this page now.
          </p>
        </div>
      </div>
    </div>
  );
}
