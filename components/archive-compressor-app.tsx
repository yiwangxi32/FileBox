"use client"

import { useMemo, useState } from "react"
import { Download, FileArchive, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/archive-utils"
import { toast } from "@/hooks/use-toast"
import { useDropzone } from "react-dropzone"

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface SelectedFile {
  id: string
  file: File
  relPath: string
  previewUrl?: string
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export function ArchiveCompressorApp() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [archiveName, setArchiveName] = useState("compressed-files")
  const [format, setFormat] = useState<"zip" | "7z">("zip")
  const [compressing, setCompressing] = useState(false)

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.file.size, 0), [files])

  const toSelectedFiles = (list: File[]) =>
    list.map((file) => {
      const lower = file.name.toLowerCase()
      const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)
      return {
        id: makeId(),
        file,
        relPath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      }
    })

  const onDrop = (accepted: File[]) => {
    setFiles((prev) => [...prev, ...toSelectedFiles(accepted)])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
  })

  const onChooseFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...toSelectedFiles(Array.from(list))])
  }

  const clearFiles = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setFiles([])
  }

  const onCompress = async () => {
    if (files.length === 0) {
      toast({ title: "请先选择文件", description: "至少上传一个文件再压缩。", variant: "destructive" })
      return
    }

    setCompressing(true)
    try {
      const form = new FormData()
      form.append("format", format)
      for (const item of files) {
        form.append("files", item.file)
        form.append("paths", item.relPath)
      }

      const res = await fetch("/api/archive/compress", {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || "compress_failed")
      }

      const blob = await res.blob()
      const filename = archiveName.trim() || "compressed-files"
      triggerDownload(blob, `${filename}.${format}`)
      toast({ title: "压缩完成", description: `已生成 ${format.toUpperCase()}，包含 ${files.length} 个文件。` })
    } catch (err) {
      const message = err instanceof Error ? err.message : "compress_failed"
      toast({ title: "压缩失败", description: message, variant: "destructive" })
    } finally {
      setCompressing(false)
    }
  }

  return (
    <section className="rounded-2xl bg-white/90 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">上传文件并生成压缩包</h2>
      <p className="mt-1 text-sm text-slate-600">支持 ZIP / 7Z。可拖拽上传或手动选择文件。</p>

      <div
        {...getRootProps()}
        className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragActive ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        <FileArchive className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-2 text-sm text-slate-700">{isDragActive ? "松开即可添加文件" : "将文件拖到此处快速上传"}</p>
        <p className="mt-1 text-xs text-slate-500">支持多选，推荐单次不超过 200 个文件</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          选择文件
          <input type="file" multiple onChange={(e) => onChooseFiles(e.target.files)} className="hidden" />
        </label>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          选择文件夹
          <input
            type="file"
            multiple
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => onChooseFiles(e.target.files)}
            className="hidden"
          />
        </label>
        <input
          type="text"
          value={archiveName}
          onChange={(e) => setArchiveName(e.target.value)}
          placeholder="输出文件名"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value === "7z" ? "7z" : "zip")}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="zip">ZIP</option>
          <option value="7z">7Z</option>
        </select>
        <Button onClick={onCompress} disabled={compressing || files.length === 0}>
          {compressing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {compressing ? "压缩中..." : "开始压缩"}
        </Button>
      </div>

      {files.length > 0 ? (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFiles}
            className="text-slate-600"
          >
            清空已选文件
          </Button>
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          已选文件：<span className="font-medium">{files.length}</span> 个，合计 <span className="font-medium">{formatBytes(totalBytes)}</span>
        </p>
        <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm text-slate-600">
          {files.length === 0 ? (
            <li className="flex items-center gap-2 text-slate-500">
              <Upload className="h-4 w-4" />
              暂未选择文件
            </li>
          ) : (
            files.map((f) => (
              <li key={f.id} className="truncate">
                {f.relPath} ({formatBytes(f.file.size)})
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-800">图片预览（最多显示 12 张）</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {files.filter((f) => !!f.previewUrl).slice(0, 12).map((f) => (
            <div key={`preview-${f.id}`} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              <img src={f.previewUrl} alt={f.relPath} className="h-20 w-full object-cover" />
              <p className="truncate px-2 py-1 text-[11px] text-slate-600">{f.file.name}</p>
            </div>
          ))}
          {files.filter((f) => !!f.previewUrl).length === 0 ? (
            <p className="col-span-full text-xs text-slate-500">当前没有可预览的图片文件。</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
