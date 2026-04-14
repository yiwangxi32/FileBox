import { NextResponse } from "next/server"
import { createArchiveSession } from "@/lib/archive-engine"

const SUPPORTED_EXTS = [".zip", ".rar", ".7z"]

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("archive")
    const password = String(form.get("password") ?? "")

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "archive file is required" }, { status: 400 })
    }

    const lower = file.name.toLowerCase()
    const matched = SUPPORTED_EXTS.some((ext) => lower.endsWith(ext))
    if (!matched) {
      return NextResponse.json({ ok: false, error: "unsupported format, only ZIP/RAR/7z" }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const result = await createArchiveSession({ name: file.name, buffer: buf }, password || undefined)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "archive_open_failed"
    if (message === "wrong_password") {
      return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
