import { ArchiveCompressorApp } from "@/components/archive-compressor-app"
import { ToolShell } from "@/components/tool-shell"

export default function ArchiveCompressorPage() {
  return (
    <ToolShell title="在线压缩包" description="上传多个文件并一键打包为 ZIP 或 7Z 下载。" badge="可用">
      <ArchiveCompressorApp />
    </ToolShell>
  )
}
