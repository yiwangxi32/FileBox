import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto mt-24 max-w-xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">页面不存在</h1>
        <p className="mt-2 text-sm text-slate-600">你访问的地址无效，可能已被移动或删除。</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">返回工具箱首页</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
