import type { APIRoute } from "astro";
import { searchIndex } from "../../../search-index";
export async function getStaticPaths() {
  const { version } = await searchIndex();
  return [{ params: { version } }];
}
export const GET: APIRoute = async ({ params }) => {
  const { json, version } = await searchIndex();
  if (params.version !== version) return new Response("Index unavailable", { status: 404 });
  return new Response(json, { headers: { "Content-Type": "application/json" } });
};
