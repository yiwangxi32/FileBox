import { ArchiveExtractorApp } from "@/components/archive-extractor-app"
import { ToolShell } from "@/components/tool-shell"

export default async function ArchiveExtractorPage() {
  return (
    <ToolShell
      title="在线解压"
      description="上传 ZIP 后浏览目录、下载单个文件，或一键导出全部文件。"
      badge="完整版"
    >
      <ArchiveExtractorApp />
    </ToolShell>
  )
}
