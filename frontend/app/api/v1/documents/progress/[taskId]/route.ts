import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const backendUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  const response = await fetch(
    `${backendUrl}/api/v1/documents/progress/${taskId}`,
    { headers: { Accept: "text/event-stream" } }
  );

  if (!response.ok || !response.body) {
    return new Response(
      JSON.stringify({ error: "Upstream SSE endpoint unavailable" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
