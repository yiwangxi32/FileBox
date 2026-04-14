import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "多功能文件工具箱",
  description:
    "轻量、快速的在线文件工具箱。支持图片压缩，并为在线解压等功能提供统一入口。",
  keywords: ["文件工具箱", "图片压缩", "在线解压", "文件处理"],
  generator: "Cursor",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  )
}