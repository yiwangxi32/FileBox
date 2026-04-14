import { NextResponse } from "next/server"
import { exportSelectedAsZip } from "@/lib/archive-engine"

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const body = (await req.json()) as { paths?: string[] }
    const paths = body.paths ?? []
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ ok: false, error: "paths is required" }, { status: 400 })
    }
    const zipBuf = await exportSelectedAsZip(params.sessionId, paths)
    return new NextResponse(new Uint8Array(zipBuf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="exported-selected.zip"',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "export_failed"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
