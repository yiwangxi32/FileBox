import { NextResponse } from "next/server"

interface TelemetryPayload {
  event: string
  level?: "info" | "warn" | "error"
  message?: string
  meta?: Record<string, unknown>
  ts?: number
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as TelemetryPayload
    if (!payload?.event) {
      return NextResponse.json({ ok: false, error: "event is required" }, { status: 400 })
    }

    // In production this can be forwarded to Sentry/Datadog/etc.
    console.log("[telemetry]", {
      event: payload.event,
      level: payload.level ?? "info",
      message: payload.message ?? "",
      meta: payload.meta ?? {},
      ts: payload.ts ?? Date.now(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 })
  }
}
