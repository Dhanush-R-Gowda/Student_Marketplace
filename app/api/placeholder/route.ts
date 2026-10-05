import { NextResponse } from "next/server";

/**
 * Returns an SVG placeholder image.
 * Usage: /api/placeholder?w=400&h=300&text=Books&bg=6366f1
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const w = parseInt(searchParams.get("w") ?? "400");
  const h = parseInt(searchParams.get("h") ?? "300");
  const text = searchParams.get("text") ?? "Image";
  const bg = searchParams.get("bg") ?? "e2e8f0";
  const fg = searchParams.get("fg") ?? "64748b";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#${bg}"/>
  <text
    x="50%" y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${Math.max(14, Math.min(32, Math.floor(w / 12)))}px"
    font-weight="500"
    fill="#${fg}"
  >${text}</text>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
