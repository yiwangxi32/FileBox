export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(2)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function parseCsvRows(text: string, maxRows = 200) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxRows)
    .map((line) => line.split(",").map((cell) => cell.trim()))
}

export function getSelectionState(paths: string[], selectedPaths: Set<string>) {
  if (paths.length === 0) return "none" as const
  const selectedCount = paths.filter((path) => selectedPaths.has(path)).length
  if (selectedCount === 0) return "none" as const
  if (selectedCount === paths.length) return "all" as const
  return "partial" as const
}
