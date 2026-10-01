import type { Route } from "./+types/api.regions";
import { getDictionaryRegions } from "~/shared/api";
import { ApiError } from "~/shared/api/http";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const langIdRaw = Number(url.searchParams.get("langId") ?? "1");
  const langId = Number.isInteger(langIdRaw) ? langIdRaw : 1;

  try {
    const regions = await getDictionaryRegions(langId);

    return Response.json({ ok: true as const, regions });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to load regions. Please try again.";

    return Response.json(
      { ok: false as const, error: message },
      { status: 500 },
    );
  }
}

