import type { Route } from "./+types/register-horeca";
import { RegisterHorecaForm } from "~/features/register-horeca";
import {
  horecaRegistrationSchema,
  toHorecaRegisterRequest,
} from "~/entities/horeca";
import { handleRegistrationProxyAction } from "~/shared/api";
import { getRegistrationFormValues } from "~/shared/lib/registration";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  return handleRegistrationProxyAction({
    formData,
    parseRegisterValues(data) {
      const values = getRegistrationFormValues(data);
      const parsed = horecaRegistrationSchema.safeParse(values);

      if (!parsed.success) {
        return {
          success: false as const,
          error:
            parsed.error.issues[0]?.message ??
            "Please check the form and try again.",
        };
      }

      return { success: true as const, values: parsed.data };
    },
    toRegisterRequest: toHorecaRegisterRequest,
    verifyMessage:
      "A verification code was sent to your email. Enter it to complete registration.",
    fallbackErrorMessage: "We could not complete HoReCa registration.",
  });
}

export default function RegisterHorecaRoutePage() {
  return <RegisterHorecaForm />;
}
