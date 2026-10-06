import { createHash } from "node:crypto";
import { notes } from "../content/notes";
export function GET() {
  const serialized = JSON.stringify(notes);
  const version = createHash("sha256").update(serialized).digest("hex");
  return new Response(JSON.stringify({ version, data: notes }), {
    headers: { "Content-Type": "application/json" },
  });
}
