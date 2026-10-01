type ProxyResponse<TBody> = {
  body: TBody;
  status?: number;
};

type ProxyActionContext = {
  formData: FormData;
  intent: string;
};

type ProxyIntentHandler<TBody> = (
  context: ProxyActionContext,
) => Promise<ProxyResponse<TBody>> | ProxyResponse<TBody>;

type ProxyErrorHandler<TBody> = (
  error: unknown,
  context: ProxyActionContext,
) => ProxyResponse<TBody>;

type ProxyActionConfig<TBody> = {
  formData: FormData;
  defaultIntent?: string;
  intentFieldName?: string;
  handlers: Record<string, ProxyIntentHandler<TBody>>;
  unknownIntentResponse: ProxyResponse<TBody>;
  onError?: ProxyErrorHandler<TBody>;
};

export async function handleProxyAction<TBody>({
  formData,
  defaultIntent = "",
  intentFieldName = "intent",
  handlers,
  unknownIntentResponse,
  onError,
}: ProxyActionConfig<TBody>) {
  const intent = String(formData.get(intentFieldName) ?? defaultIntent);
  const context: ProxyActionContext = { formData, intent };
  const handler = handlers[intent];

  if (!handler) {
    return Response.json(unknownIntentResponse.body, {
      status: unknownIntentResponse.status ?? 400,
    });
  }

  try {
    const response = await handler(context);

    return Response.json(response.body, {
      status: response.status ?? 200,
    });
  } catch (error) {
    if (!onError) {
      throw error;
    }

    const response = onError(error, context);

    return Response.json(response.body, {
      status: response.status ?? 500,
    });
  }
}

export type { ProxyActionContext, ProxyResponse };
