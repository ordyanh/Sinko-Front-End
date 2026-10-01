import type { Route } from "./+types/api.categories";
import { getDictionaryCategories } from "~/shared/api";
import { ApiError } from "~/shared/api/http";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const langIdRaw = Number(url.searchParams.get("langId") ?? "2");
  const langId = Number.isInteger(langIdRaw) ? langIdRaw : 2;

  try {
    const categories = await getDictionaryCategories(langId);

    return Response.json({ ok: true as const, categories });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to load categories. Please try again.";

    return Response.json(
      { ok: false as const, error: message },
      { status: 500 },
    );
  }
}

