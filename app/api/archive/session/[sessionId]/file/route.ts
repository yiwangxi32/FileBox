import { stat } from "fs/promises"
import { createReadStream } from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { Readable } from "stream"
import { resolveFilePath } from "@/lib/archive-engine"

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const url = new URL(req.url)
  const relPath = url.searchParams.get("path")
  if (!relPath) return NextResponse.json({ ok: false, error: "path is required" }, { status: 400 })

  try {
    const fullPath = await resolveFilePath(params.sessionId, relPath)
    const s = await stat(fullPath)
    if (s.isDirectory()) {
      return NextResponse.json({ ok: false, error: "path is directory" }, { status: 400 })
    }

    const ext = path.extname(relPath).toLowerCase()
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".csv"
          ? "text/csv; charset=utf-8"
          : [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"].includes(ext)
            ? `image/${ext.replace(".", "") === "jpg" ? "jpeg" : ext.replace(".", "")}`
            : "application/octet-stream"

    const nodeStream = createReadStream(fullPath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(relPath))}"`,
        "Content-Length": String(s.size),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "file_not_found"
    return NextResponse.json({ ok: false, error: message }, { status: 404 })
  }
}
