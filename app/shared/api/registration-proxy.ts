import { ApiError } from "./http";
import { confirmEmail, registerUser, resendConfirmationCode } from "./auth";
import { handleProxyAction } from "./proxy-action";

type ProxyActionResponse =
  | { ok: true; step: "verify" | "done"; message?: string }
  | { ok: false; error: string };

type RegisterParseResult<TValues> =
  { success: true; values: TValues } | { success: false; error: string };

type RegistrationProxyConfig<TValues> = {
  formData: FormData;
  parseRegisterValues: (formData: FormData) => RegisterParseResult<TValues>;
  toRegisterRequest: (values: TValues) => Parameters<typeof registerUser>[0];
  verifyMessage: string;
  fallbackErrorMessage: string;
};

export async function handleRegistrationProxyAction<TValues>({
  formData,
  parseRegisterValues,
  toRegisterRequest,
  verifyMessage,
  fallbackErrorMessage,
}: RegistrationProxyConfig<TValues>) {
  return handleProxyAction<ProxyActionResponse>({
    formData,
    defaultIntent: "register",
    handlers: {
      async register({ formData: data }) {
        const parsed = parseRegisterValues(data);

        if (!parsed.success) {
          return {
            body: {
              ok: false,
              error: parsed.error,
            },
            status: 400,
          };
        }

        await registerUser(toRegisterRequest(parsed.values));

        return {
          body: {
            ok: true,
            step: "verify",
            message: verifyMessage,
          },
        };
      },
      async confirm({ formData: data }) {
        const email = String(data.get("email") ?? "").trim();
        const code = String(data.get("verificationCode") ?? "").trim();

        if (!email || !code) {
          return {
            body: {
              ok: false,
              error: "Email and verification code are required.",
            },
            status: 400,
          };
        }

        await confirmEmail({ email, code });

        return {
          body: {
            ok: true,
            step: "done",
          },
        };
      },
      async resend({ formData: data }) {
        const email = String(data.get("email") ?? "").trim();

        if (!email) {
          return {
            body: {
              ok: false,
              error: "Enter an email address before requesting a new code.",
            },
            status: 400,
          };
        }

        await resendConfirmationCode(email);

        return {
          body: {
            ok: true,
            step: "verify",
            message: "A new verification code has been sent.",
          },
        };
      },
    },
    unknownIntentResponse: {
      body: { ok: false, error: "Unknown submission intent." },
      status: 400,
    },
    onError(error) {
      const status =
        error instanceof ApiError &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
          ? error.status
          : 500;
      return {
        body: {
          ok: false,
          error:
            error instanceof ApiError ? error.message : fallbackErrorMessage,
        },
        status,
      };
    },
  });
}
