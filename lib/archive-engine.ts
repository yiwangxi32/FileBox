import { execFile } from "child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises"
import { existsSync } from "fs"
import os from "os"
import path from "path"
import { promisify } from "util"
import { path7za } from "7zip-bin"
import crypto from "crypto"
import JSZip from "jszip"

const execFileAsync = promisify(execFile)
const BASE_DIR = path.join(os.tmpdir(), "file-toolbox-archives")
const SESSION_TTL_MS = 30 * 60 * 1000

export interface ExtractedEntry {
  path: string
  name: string
  isDir: boolean
  size: number
}

interface ArchiveSession {
  id: string
  rootDir: string
  extractDir: string
  archivePath: string
  createdAt: string
}

const sessionMap = new Map<string, ArchiveSession>()
const SESSION_META_FILENAME = "session.json"

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

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, "_")
}

function toRelix(p: string) {
  return p.split(path.sep).join("/")
}

function ensureWithinRoot(root: string, target: string) {
  const normalized = path.resolve(target)
  const normalizedRoot = path.resolve(root)
  if (!normalized.startsWith(normalizedRoot)) throw new Error("Invalid path access")
  return normalized
}

async function walkDir(absDir: string, root: string): Promise<ExtractedEntry[]> {
  const items = await readdir(absDir, { withFileTypes: true })
  const rows: ExtractedEntry[] = []
  for (const item of items) {
    const full = path.join(absDir, item.name)
    const rel = toRelix(path.relative(root, full))
    if (item.isDirectory()) {
      rows.push({ path: rel, name: item.name, isDir: true, size: 0 })
      rows.push(...(await walkDir(full, root)))
    } else {
      const s = await stat(full)
      rows.push({ path: rel, name: item.name, isDir: false, size: s.size })
    }
  }
  return rows.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.path.localeCompare(b.path)
  })
}

async function cleanupExpiredSessions() {
  const now = Date.now()
  const targets = Array.from(sessionMap.values()).filter((s) => now - new Date(s.createdAt).getTime() > SESSION_TTL_MS)
  for (const s of targets) {
    sessionMap.delete(s.id)
    await rm(s.rootDir, { recursive: true, force: true })
  }
}

async function writeSessionMeta(session: ArchiveSession) {
  const metaPath = path.join(session.rootDir, SESSION_META_FILENAME)
  await writeFile(metaPath, JSON.stringify(session), "utf-8")
}

async function readSessionMeta(sessionId: string) {
  const rootDir = path.join(BASE_DIR, sessionId)
  const metaPath = path.join(rootDir, SESSION_META_FILENAME)
  if (!existsSync(metaPath)) return undefined
  const raw = await readFile(metaPath, "utf-8")
  return JSON.parse(raw) as ArchiveSession
}

export async function createArchiveSession(file: { name: string; buffer: Buffer }, password?: string) {
  await cleanupExpiredSessions()
  await mkdir(BASE_DIR, { recursive: true })

  const sessionId = crypto.randomUUID()
  const rootDir = path.join(BASE_DIR, sessionId)
  const uploadDir = path.join(rootDir, "upload")
  const extractDir = path.join(rootDir, "extracted")
  await mkdir(uploadDir, { recursive: true })
  await mkdir(extractDir, { recursive: true })

  const archivePath = path.join(uploadDir, sanitizeFilename(file.name || "archive"))
  await writeFile(archivePath, file.buffer)

  const args = ["x", archivePath, `-o${extractDir}`, "-y"]
  if (password) args.push(`-p${password}`)

  try {
    const sevenZipPath = resolve7zaBinaryPath()
    await execFileAsync(sevenZipPath, args, { windowsHide: true, maxBuffer: 1024 * 1024 * 20 })
  } catch (err) {
    await rm(rootDir, { recursive: true, force: true })
    const msg = err instanceof Error ? err.message : "archive_extract_failed"
    if (/Wrong password|Data Error in encrypted file|Can not open encrypted archive/i.test(msg)) {
      throw new Error("wrong_password")
    }
    throw new Error(`archive_extract_failed: ${msg}`)
  }

  const entries = await walkDir(extractDir, extractDir)
  const session: ArchiveSession = {
    id: sessionId,
    rootDir,
    extractDir,
    archivePath,
    createdAt: new Date().toISOString(),
  }
  sessionMap.set(sessionId, session)
  await writeSessionMeta(session)
  return { sessionId, entries }
}

export async function getSession(sessionId: string) {
  const fromMemory = sessionMap.get(sessionId)
  if (fromMemory) return fromMemory

  const fromDisk = await readSessionMeta(sessionId)
  if (!fromDisk) return undefined

  // Validate extracted dir still exists.
  if (!existsSync(fromDisk.extractDir)) return undefined
  sessionMap.set(sessionId, fromDisk)
  return fromDisk
}

export async function resolveFilePath(sessionId: string, relPath: string) {
  const session = await getSession(sessionId)
  if (!session) throw new Error("session_not_found")
  const full = ensureWithinRoot(session.extractDir, path.join(session.extractDir, relPath))
  return full
}

export async function readTextPreview(sessionId: string, relPath: string, maxChars: number) {
  const full = await resolveFilePath(sessionId, relPath)
  const text = await readFile(full, "utf-8")
  return text.slice(0, maxChars)
}

export async function exportSelectedAsZip(sessionId: string, relPaths: string[]) {
  const session = await getSession(sessionId)
  if (!session) throw new Error("session_not_found")
  const zip = new JSZip()

  for (const relPath of relPaths) {
    const full = ensureWithinRoot(session.extractDir, path.join(session.extractDir, relPath))
    const s = await stat(full)
    if (s.isDirectory()) continue
    const content = await readFile(full)
    zip.file(relPath, content)
  }

  return zip.generateAsync({ type: "nodebuffer" })
}
