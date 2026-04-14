"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global app error:", error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto mt-24 max-w-xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">页面发生错误</h1>
          <p className="mt-2 text-sm text-slate-600">
            系统已捕获本次异常。你可以尝试重新加载当前页面，或返回工具箱首页继续使用。
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={reset}>重试</Button>
            <Button asChild variant="outline">
              <Link href="/">返回首页</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
