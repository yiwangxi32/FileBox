import { execFile } from "child_process"
import { createReadStream, existsSync } from "fs"
import { mkdir, readdir, rm, stat, writeFile } from "fs/promises"
import { NextResponse } from "next/server"
import os from "os"
import path from "path"
import { Readable } from "stream"
import { promisify } from "util"
import { path7za } from "7zip-bin"

const execFileAsync = promisify(execFile)

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_")
}

function sanitizeRelativePath(input: string) {
  const normalized = input.replace(/\\/g, "/").split("/").filter(Boolean)
  const safeParts = normalized.map((part) => sanitizeFilename(part)).filter(Boolean)
  return safeParts.join("/")
}

function resolve7zaBinaryPath() {
  const platformFolder = process.platform === "win32" ? "win" : process.platform
  const archFolder = process.arch === "x64" || process.arch === "arm64" || process.arch === "ia32" ? process.arch : "x64"
  const exeName = process.platform === "win32" ? "7za.exe" : "7za"
  const fallbackFromCwd = path.join(process.cwd(), "node_modules", "7zip-bin", platformFolder, archFolder, exeName)
  const candidates = [path7za, fallbackFromCwd]
  for (const p of candidates) {
    if (p && existsSync(p)) return p
  }
  throw new Error(`archive_binary_not_found: ${candidates.join(" | ")}`)
}

export async function POST(req: Request) {
  const form = await req.formData()
  const rawFormat = String(form.get("format") ?? "zip").toLowerCase()
  const format = rawFormat === "7z" ? "7z" : "zip"
  const files = form.getAll("files").filter((item): item is File => item instanceof File)
  const relPaths = form.getAll("paths").map((item) => String(item))

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "files_required" }, { status: 400 })
  }

  const tempRoot = path.join(os.tmpdir(), `file-toolbox-compress-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const inputDir = path.join(tempRoot, "input")
  const outDir = path.join(tempRoot, "out")

  try {
    await mkdir(inputDir, { recursive: true })
    await mkdir(outDir, { recursive: true })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fromClient = relPaths[i] || file.name || "file"
      const safeRelPath = sanitizeRelativePath(fromClient) || sanitizeFilename(file.name || "file")
      const target = path.join(inputDir, safeRelPath)
      await mkdir(path.dirname(target), { recursive: true })
      const buf = Buffer.from(await file.arrayBuffer())
      await writeFile(target, buf)
    }

    const outputName = `compressed.${format}`
    const outputPath = path.join(outDir, outputName)
    const sevenZipPath = resolve7zaBinaryPath()

    const inputFiles = await readdir(inputDir)
    const args = ["a", `-t${format}`, outputPath, ...inputFiles]
    await execFileAsync(sevenZipPath, args, { cwd: inputDir, windowsHide: true, maxBuffer: 20 * 1024 * 1024 })

    const archiveStat = await stat(outputPath)
    const stream = createReadStream(outputPath)
    const webStream = Readable.toWeb(stream) as ReadableStream
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": format === "zip" ? "application/zip" : "application/x-7z-compressed",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Content-Length": String(archiveStat.size),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "compress_failed"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  } finally {
    // Delay cleanup slightly to avoid deleting file before response stream opens on slower systems.
    setTimeout(() => {
      void rm(tempRoot, { recursive: true, force: true })
    }, 3000)
  }
}
