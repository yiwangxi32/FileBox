import Link from "next/link"
import type { ReactNode } from "react"

interface ToolShellProps {
  title: string
  description: string
  badge?: string
  children: ReactNode
}

export function ToolShell({ title, description, badge, children }: ToolShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            返回工具箱首页
          </Link>
          {badge ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">{badge}</span>
          ) : null}
        </div>

        <header className="mb-6 rounded-2xl bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-600">{description}</p>
        </header>

        {children}
      </div>
    </main>
  )
}
