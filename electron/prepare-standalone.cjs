const fs = require("fs")
const path = require("path")

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function main() {
  const root = process.cwd()
  const standaloneRoot = path.join(root, ".next", "standalone")
  const standaloneStatic = path.join(standaloneRoot, ".next", "static")
  const sourceStatic = path.join(root, ".next", "static")
  const sourcePublic = path.join(root, "public")
  const standalonePublic = path.join(standaloneRoot, "public")

  if (!fs.existsSync(path.join(standaloneRoot, "server.js"))) {
    throw new Error("standalone server.js not found, run next build first")
  }

  copyDirSync(sourceStatic, standaloneStatic)
  copyDirSync(sourcePublic, standalonePublic)
  console.log("[prepare-standalone] copied static/public into standalone")
}

main()

