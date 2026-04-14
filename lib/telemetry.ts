interface TelemetryPayload {
  event: string
  level?: "info" | "warn" | "error"
  message?: string
  meta?: Record<string, unknown>
}

export function trackEvent(payload: TelemetryPayload) {
  if (typeof window === "undefined") return
  if (process.env.NEXT_PUBLIC_TELEMETRY_ENABLED !== "true") return

  const rawSampleRate = Number(process.env.NEXT_PUBLIC_TELEMETRY_SAMPLE_RATE ?? "1")
  const sampleRate = Number.isFinite(rawSampleRate) ? Math.min(1, Math.max(0, rawSampleRate)) : 1
  if (Math.random() > sampleRate) return

  const body = JSON.stringify({
    ...payload,
    ts: Date.now(),
  })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/telemetry", blob)
      return
    }
  } catch {
    // fallback to fetch below
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
}
