import Link from "next/link"
import type { ReactNode } from "react"

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <span className="font-semibold text-slate-900">工具导航</span>
          <Link href="/tools/image-compressor" className="text-slate-600 transition hover:text-slate-900">
            图片压缩
          </Link>
          <Link href="/tools/archive-extractor" className="text-slate-600 transition hover:text-slate-900">
            在线解压
          </Link>
          <Link href="/tools/archive-compressor" className="text-slate-600 transition hover:text-slate-900">
            在线压缩包
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
