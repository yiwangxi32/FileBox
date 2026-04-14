"use client"

import Link from "next/link"
import { Archive, FileArchive, ImageIcon } from "lucide-react"

const cards = [
  {
    title: "图片压缩",
    desc: "上传图片，快速压缩导出。",
    href: "/tools/image-compressor",
    icon: ImageIcon,
    style: "from-indigo-500 to-blue-500",
  },
  {
    title: "在线解压",
    desc: "支持 ZIP / RAR / 7z 在线解包。",
    href: "/tools/archive-extractor",
    icon: Archive,
    style: "from-emerald-500 to-cyan-500",
  },
  {
    title: "在线压缩包",
    desc: "文件/文件夹打包 ZIP / 7Z。",
    href: "/tools/archive-compressor",
    icon: FileArchive,
    style: "from-cyan-500 to-indigo-500",
  },
]

export function HomeHeroCarousel() {
  return (
    <div className="mx-auto mt-6 max-w-5xl">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group rounded-2xl bg-gradient-to-br ${card.style} p-[1px] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="h-full rounded-2xl bg-white/95 p-5 text-left">
                <div className="inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xl font-semibold text-slate-900">{card.title}</p>
                <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
                <p className="mt-4 text-sm font-semibold text-indigo-700 transition group-hover:text-indigo-900">立即进入</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
