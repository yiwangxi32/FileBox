import { NextResponse } from "next/server"
import { ARCHIVE_LIMITS } from "@/lib/archive-config"
import { readTextPreview } from "@/lib/archive-engine"

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const url = new URL(req.url)
  const relPath = url.searchParams.get("path")
  if (!relPath) return NextResponse.json({ ok: false, error: "path is required" }, { status: 400 })

  try {
    const text = await readTextPreview(params.sessionId, relPath, ARCHIVE_LIMITS.maxCsvPreviewChars)
    return NextResponse.json({ ok: true, text })
  } catch (err) {
    const message = err instanceof Error ? err.message : "read_text_failed"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
