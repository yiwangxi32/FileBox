import { NextResponse } from "next/server"

const startedAt = Date.now()

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  })
}
