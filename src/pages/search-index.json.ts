import { searchIndex } from "../search-index";
export async function GET() {
  return new Response((await searchIndex()).json, {
    headers: { "Content-Type": "application/json" },
  });
}
