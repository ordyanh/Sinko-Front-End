import type { Route } from "./+types/register-supplier";
import { RegisterSupplierForm } from "~/features/register-supplier";
import {
  supplierRegistrationSchema,
  toSupplierRegisterRequest,
} from "~/entities/supplier";
import { registerSupplier } from "~/shared/api/auth";
import { ApiError } from "~/shared/api/http";
import { getRegistrationFormValues } from "~/shared/lib/registration";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const values = getRegistrationFormValues(formData);
  const parsed = supplierRegistrationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.issues[0]?.message ??
        "Please check the form and try again.",
    };
  }

  try {
    const payload = toSupplierRegisterRequest(parsed.data);
    const result = await registerSupplier(payload);

    return {
      ok: true as const,
      step: "verify" as const,
      message:
        result?.message ??
        "A verification code was sent to your email. Enter it to activate the supplier account.",
    };
  } catch (error: unknown) {
    return {
      ok: false as const,
      error:
        error instanceof ApiError
          ? error.message
          : "We could not complete supplier registration.",
    };
  }
}

export default function RegisterSupplierRoutePage() {
  return <RegisterSupplierForm />;
}
