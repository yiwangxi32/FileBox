import { Archive, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { HomeHeroCarousel } from "@/components/home-hero-carousel"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="text-center">
          <p className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur">
            <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
            轻量在线文件处理工具
          </p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 bg-clip-text text-transparent">
              多功能文件工具箱
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
            一个站点完成常用文件处理任务。先从图片压缩开始，接下来将支持在线解压与更多工具。
          </p>
          <HomeHeroCarousel />
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/85 p-4 shadow-sm">
            <Zap className="h-5 w-5 text-indigo-600" />
            <h3 className="mt-2 font-semibold text-slate-900">快速处理</h3>
            <p className="mt-1 text-sm text-slate-600">核心能力在浏览器内完成，减少等待时间。</p>
          </div>
          <div className="rounded-xl bg-white/85 p-4 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-2 font-semibold text-slate-900">更安心</h3>
            <p className="mt-1 text-sm text-slate-600">文件处理流程明确，后续将持续完善失败提示与约束。</p>
          </div>
          <div className="rounded-xl bg-white/85 p-4 shadow-sm">
            <Archive className="h-5 w-5 text-cyan-600" />
            <h3 className="mt-2 font-semibold text-slate-900">可扩展工具集</h3>
            <p className="mt-1 text-sm text-slate-600">统一入口，逐步接入解压、格式转换等能力。</p>
          </div>
        </section>
      </div>
    </main>
  )
}

