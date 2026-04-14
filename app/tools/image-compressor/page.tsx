import { CompressorApp } from "@/components/compressor-app"
import { ToolShell } from "@/components/tool-shell"

export default function ImageCompressorPage() {
  return (
    <ToolShell
      title="图片压缩"
      description="上传图片后可按目标体积与分辨率压缩，适合发图前减小文件大小。"
      badge="稳定版"
    >
      <CompressorApp />
    </ToolShell>
  )
}
