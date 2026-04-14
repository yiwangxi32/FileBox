"use client"

import { useMemo, useRef, useState } from "react"
import { Download, Eye, FileArchive, FileText, FolderOpen, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { ARCHIVE_LIMITS } from "@/lib/archive-config"
import { formatBytes, getSelectionState, parseCsvRows } from "@/lib/archive-utils"
import { trackEvent } from "@/lib/telemetry"

interface ExtractedEntry {
  path: string
  name: string
  isDir: boolean
  size: number
}

interface PreviewState {
  path: string
  kind: "image" | "text" | "csv" | "pdf"
  content: string
}

interface TreeNode {
  path: string
  name: string
  isDir: boolean
  size: number
  children: TreeNode[]
  filePaths: string[]
}

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

export function ArchiveExtractorApp() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [archiveName, setArchiveName] = useState("")
  const [password, setPassword] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [entries, setEntries] = useState<ExtractedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["/"]))
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [previewLoadingPath, setPreviewLoadingPath] = useState<string | null>(null)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)

  const fileEntries = useMemo(() => entries.filter((e) => !e.isDir), [entries])
  const totalSize = useMemo(() => fileEntries.reduce((sum, e) => sum + e.size, 0), [fileEntries])
  const selectedFileEntries = useMemo(() => fileEntries.filter((e) => selectedPaths.has(e.path)), [fileEntries, selectedPaths])
  const selectedSize = useMemo(() => selectedFileEntries.reduce((sum, e) => sum + e.size, 0), [selectedFileEntries])

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return entries
    return entries.filter((e) => e.path.toLowerCase().includes(keyword))
  }, [entries, query])
  const visiblePaths = useMemo(() => new Set(filteredEntries.map((e) => e.path)), [filteredEntries])

  const tree = useMemo<TreeNode>(() => {
    const root: TreeNode = { path: "/", name: "/", isDir: true, size: 0, children: [], filePaths: [] }
    const dirMap = new Map<string, TreeNode>([["/", root]])
    const ensureDir = (dirPath: string, name: string, parentPath: string) => {
      if (dirMap.has(dirPath)) return dirMap.get(dirPath)!
      const node: TreeNode = { path: dirPath, name, isDir: true, size: 0, children: [], filePaths: [] }
      dirMap.set(dirPath, node)
      ;(dirMap.get(parentPath) ?? root).children.push(node)
      return node
    }

    for (const entry of entries) {
      const normalized = entry.path.replace(/\/+$/, "")
      if (!normalized) continue
      const parts = normalized.split("/")
      const isFile = !entry.isDir
      let parentPath = "/"
      let currentPath = ""
      for (let i = 0; i < parts.length - (isFile ? 1 : 0); i++) {
        currentPath = `${currentPath}/${parts[i]}`
        ensureDir(currentPath, parts[i], parentPath)
        parentPath = currentPath
      }
      if (isFile) {
        ;(dirMap.get(parentPath) ?? root).children.push({
          path: entry.path,
          name: parts[parts.length - 1],
          isDir: false,
          size: entry.size,
          children: [],
          filePaths: [entry.path],
        })
      }
    }

    const finalize = (node: TreeNode): string[] => {
      if (!node.isDir) return node.filePaths
      node.children.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      const files: string[] = []
      for (const child of node.children) files.push(...finalize(child))
      node.filePaths = files
      node.size = files
        .map((p) => fileEntries.find((e) => e.path === p)?.size ?? 0)
        .reduce((sum, s) => sum + s, 0)
      return files
    }
    finalize(root)
    return root
  }, [entries, fileEntries])

  const openArchive = async (file: File) => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("archive", file)
      if (password) fd.append("password", password)

      const res = await fetch("/api/archive/session", { method: "POST", body: fd })
      const data = (await res.json()) as { ok: boolean; sessionId?: string; entries?: ExtractedEntry[]; error?: string }
      if (!res.ok || !data.ok || !data.sessionId || !data.entries) {
        if (data.error === "wrong_password") {
          throw new Error("wrong_password")
        }
        throw new Error(data.error ?? "archive_open_failed")
      }

      setArchiveName(file.name)
      setSessionId(data.sessionId)
      setEntries(data.entries)
      setSelectedPaths(new Set(data.entries.filter((e) => !e.isDir).map((e) => e.path)))
      setExpandedDirs(new Set(["/"]))
      setPreview(null)
      trackEvent({
        event: "archive_open_success",
        meta: { archive: file.name, count: data.entries.length },
      })
      toast({ title: "解析完成", description: `共 ${data.entries.length} 条目录项。` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "archive_open_failed"
      trackEvent({ event: "archive_open_failed", level: "error", message: msg })
      toast({
        title: "打开失败",
        description: msg === "wrong_password" ? "密码错误，请确认后重试。" : msg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChooseArchive = () => {
    fileInputRef.current?.click()
  }

  const toggleSelect = (p: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const toggleSelectPaths = (paths: string[]) => {
    if (paths.length === 0) return
    setSelectedPaths((prev) => {
      const all = paths.every((p) => prev.has(p))
      const next = new Set(prev)
      for (const p of paths) all ? next.delete(p) : next.add(p)
      return next
    })
  }

  const handleSelectAllVisible = () => {
    const visibleFiles = filteredEntries.filter((e) => !e.isDir).map((e) => e.path)
    toggleSelectPaths(visibleFiles)
  }

  const toggleExpand = (p: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const shouldShowNode = (node: TreeNode) => {
    if (!query.trim()) return true
    if (!node.isDir) return visiblePaths.has(node.path)
    return node.filePaths.some((p) => visiblePaths.has(p))
  }

  const fileUrl = (relPath: string) =>
    sessionId ? `/api/archive/session/${encodeURIComponent(sessionId)}/file?path=${encodeURIComponent(relPath)}` : "#"

  const handlePreview = async (relPath: string) => {
    if (!sessionId) return
    setPreviewLoadingPath(relPath)
    try {
      const lower = relPath.toLowerCase()
      if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)) {
        setPreview({ path: relPath, kind: "image", content: fileUrl(relPath) })
        return
      }
      if (/\.pdf$/.test(lower)) {
        setPreview({ path: relPath, kind: "pdf", content: fileUrl(relPath) })
        return
      }
      const isCsv = /\.csv$/.test(lower)
      const isText = /\.(txt|md|json|js|ts|tsx|html|css|xml|yml|yaml|csv)$/.test(lower)
      if (isText) {
        const resp = await fetch(`/api/archive/session/${encodeURIComponent(sessionId)}/text?path=${encodeURIComponent(relPath)}`)
        const data = (await resp.json()) as { ok: boolean; text?: string; error?: string }
        if (!resp.ok || !data.ok || typeof data.text !== "string") throw new Error(data.error ?? "preview_failed")
        setPreview({ path: relPath, kind: isCsv ? "csv" : "text", content: data.text })
        return
      }
      toast({ title: "暂不支持预览", description: "该类型文件可直接下载查看。" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "preview_failed"
      toast({ title: "预览失败", description: msg, variant: "destructive" })
    } finally {
      setPreviewLoadingPath(null)
    }
  }

  const handleDownloadOne = async (relPath: string) => {
    if (!sessionId) return
    setDownloadingPath(relPath)
    try {
      const res = await fetch(fileUrl(relPath))
      if (!res.ok) throw new Error("download_failed")
      const blob = await res.blob()
      triggerDownload(blob, relPath.split("/").pop() || "file")
    } catch {
      toast({ title: "下载失败", description: relPath, variant: "destructive" })
    } finally {
      setDownloadingPath(null)
    }
  }

  const handleExportSelected = async () => {
    if (!sessionId || selectedFileEntries.length === 0) return
    setDownloadingAll(true)
    try {
      const res = await fetch(`/api/archive/session/${encodeURIComponent(sessionId)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: selectedFileEntries.map((e) => e.path) }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || "export_failed")
      }
      const blob = await res.blob()
      const base = archiveName.replace(/\.(zip|rar|7z)$/i, "") || "archive"
      triggerDownload(blob, `${base}-selected.zip`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "export_failed"
      toast({ title: "导出失败", description: msg, variant: "destructive" })
    } finally {
      setDownloadingAll(false)
    }
  }

  const renderTree = (node: TreeNode, depth: number): React.ReactNode =>
    node.children
      .filter((child) => shouldShowNode(child))
      .map((child) => {
        if (child.isDir) {
          const expanded = expandedDirs.has(child.path)
          const selCount = child.filePaths.filter((p) => selectedPaths.has(p)).length
          const state = getSelectionState(child.filePaths, selectedPaths)
          return (
            <div key={child.path}>
              <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>
                  <button type="button" className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-100" onClick={() => toggleExpand(child.path)}>
                    {expanded ? <span>-</span> : <span>+</span>}
                  </button>
                  <input
                    type="checkbox"
                    checked={state === "all"}
                    ref={(el) => {
                      if (el) el.indeterminate = state === "partial"
                    }}
                    onChange={() => toggleSelectPaths(child.filePaths)}
                    className="h-4 w-4"
                  />
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{child.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {selCount}/{child.filePaths.length} 个文件已选
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{formatBytes(child.size)}</span>
              </div>
              {expanded ? <div>{renderTree(child, depth + 1)}</div> : null}
            </div>
          )
        }

        const selected = selectedPaths.has(child.path)
        return (
          <div key={child.path} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
            <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 14 + 18}px` }}>
              <input type="checkbox" checked={selected} onChange={() => toggleSelect(child.path)} className="h-4 w-4" />
              <FileText className="h-4 w-4 text-slate-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{child.name}</p>
                <p className="truncate text-xs text-slate-500">{child.path}</p>
              </div>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              <span className="text-xs text-slate-500">{formatBytes(child.size)}</span>
              <Button variant="outline" size="sm" onClick={() => void handlePreview(child.path)} disabled={previewLoadingPath === child.path}>
                {previewLoadingPath === child.path ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                预览
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleDownloadOne(child.path)} disabled={downloadingPath === child.path}>
                {downloadingPath === child.path ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                下载
              </Button>
            </div>
          </div>
        )
      })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">上传压缩包（ZIP / RAR / 7z）</h2>
        <p className="mt-1 text-sm text-slate-600">支持加密压缩包，请在下方输入密码。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.rar,.7z"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void openArchive(f)
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={handleChooseArchive} className="shrink-0">
                选择压缩包
              </Button>
              <p className="truncate text-xs text-slate-500">{archiveName || "未选择文件"}</p>
            </div>
          </div>
          <Input type="password" placeholder="加密压缩包密码（可选）" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="outline" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {loading ? "解析中..." : "等待选择文件"}
          </Button>
        </div>
        {archiveName ? <p className="mt-3 text-sm text-slate-600">当前压缩包：{archiveName}</p> : null}
      </section>

      <section className="rounded-2xl bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">解压结果</h3>
            <p className="mt-1 text-sm text-slate-600">
              文件数 {fileEntries.length}，总计 {formatBytes(totalSize)}，已勾选 {selectedFileEntries.length}（{formatBytes(selectedSize)}）
            </p>
          </div>
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按路径搜索" className="w-48" />
            <Button variant="outline" onClick={handleSelectAllVisible} disabled={filteredEntries.length === 0}>
              当前结果全选/反选
            </Button>
            <Button onClick={() => void handleExportSelected()} disabled={!sessionId || selectedFileEntries.length === 0 || downloadingAll}>
              {downloadingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloadingAll ? "导出中..." : "导出勾选项"}
            </Button>
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">暂无文件，请先上传压缩包。</div>
          ) : (
            <div className="divide-y divide-slate-100">{renderTree(tree, 0)}</div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white/90 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">文件预览</h3>
        {preview ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-slate-500">{preview.path}</p>
            {preview.kind === "image" ? (
              <img src={preview.content} alt={preview.path} className="max-h-[360px] rounded-lg border border-slate-200" />
            ) : preview.kind === "pdf" ? (
              <iframe src={preview.content} title={preview.path} className="h-[420px] w-full rounded-lg border border-slate-200 bg-white" />
            ) : preview.kind === "csv" ? (
              <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full border-collapse text-xs">
                  <tbody>
                    {parseCsvRows(preview.content, ARCHIVE_LIMITS.maxCsvPreviewRows).map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-slate-50">
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="border border-slate-200 px-2 py-1 text-slate-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="max-h-[360px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{preview.content}</pre>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">选择文件后点击“预览”可查看文本、图片、CSV、PDF。</p>
        )}
      </section>

      <section className="rounded-2xl bg-white/90 p-6 shadow-sm">
        <p className="flex items-center text-sm text-slate-600">
          <FileArchive className="mr-2 h-4 w-4" />
          当前版本支持 ZIP / RAR / 7z（含加密压缩包，需密码）。
        </p>
      </section>
    </div>
  )
}
