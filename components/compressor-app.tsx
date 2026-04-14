"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/hooks/use-toast"
import { Upload, Download, Trash2, ImageIcon } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"

type ImageFormat = "image/jpeg" | "image/png" | "image/webp"

interface UploadedFile extends File {
  id: string
  preview: string
}

interface CompressedImage {
  id: string
  original: File
  originalPreview: string
  compressed: Blob
  url: string
  originalSize: number
  compressedSize: number
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export image blob"))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

export function CompressorApp() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState<ImageFormat>("image/jpeg")
  const [targetSize, setTargetSize] = useState<number>(50)
  const [width, setWidth] = useState<number | "">("")
  const [height, setHeight] = useState<number | "">("")
  const [activeTab, setActiveTab] = useState("upload")

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Keep original File/Blob prototype for createImageBitmap.
    const newFiles = acceptedFiles.map(
      (file) =>
        Object.assign(file, {
          id: makeId(),
          preview: URL.createObjectURL(file),
        }) as UploadedFile,
    )
    setFiles((prevFiles) => [...prevFiles, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxSize: 10 * 1024 * 1024, // 10MB max size
  })

  const compressImage = async (file: UploadedFile): Promise<CompressedImage> => {
    const bitmap = await createImageBitmap(file)
    try {
      let targetWidth = width || bitmap.width
      let targetHeight = height || bitmap.height

      if (width && !height) {
        targetHeight = Math.round((bitmap.height / bitmap.width) * width)
      } else if (!width && height) {
        targetWidth = Math.round((bitmap.width / bitmap.height) * height)
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Failed to get canvas context")

      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

      const targetBytes = targetSize * 1024
      const minQ = 0.1
      const maxQ = Math.max(minQ, quality / 100)

      // Binary search quality to hit target size with fewer encode passes.
      let low = minQ
      let high = maxQ
      let best: Blob | null = null
      let bestSize = Number.POSITIVE_INFINITY

      for (let i = 0; i < 8; i++) {
        const q = (low + high) / 2
        const blob = await blobFromCanvas(canvas, format, q)

        if (blob.size <= bestSize) {
          best = blob
          bestSize = blob.size
        }

        if (blob.size > targetBytes) {
          high = q
        } else {
          low = q
        }
      }

      const compressed = best ?? (await blobFromCanvas(canvas, format, minQ))
      return {
        id: file.id,
        original: file,
        originalPreview: file.preview,
        compressed,
        url: URL.createObjectURL(compressed),
        originalSize: file.size,
        compressedSize: compressed.size,
      }
    } finally {
      bitmap.close()
    }
  }

  const handleCompress = async () => {
    setIsCompressing(true)
    try {
      const compressed = await Promise.all(files.map(compressImage))
      setCompressedImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.url))
        return compressed
      })
      setActiveTab("results")
      toast({
        title: "压缩完成",
        description: `已处理 ${compressed.length} 张图片。`,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      toast({ title: "压缩失败", description: message, variant: "destructive" })
    } finally {
      setIsCompressing(false)
    }
  }

  const handleDownload = (image: CompressedImage) => {
    const link = document.createElement("a")
    link.href = image.url
    link.download = `compressed_${image.original.name.split(".")[0]}.${format.split("/")[1]}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = () => {
    compressedImages.forEach(handleDownload)
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id))
  }

  const handleRemoveAllFiles = () => {
    setFiles([])
  }

  useEffect(() => {
    return () => files.forEach((file) => URL.revokeObjectURL(file.preview))
  }, [files])

  useEffect(() => {
    return () => compressedImages.forEach((img) => URL.revokeObjectURL(img.url))
  }, [compressedImages])

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. 上传</TabsTrigger>
          <TabsTrigger value="settings">2. 设置</TabsTrigger>
          <TabsTrigger value="results">3. 结果</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-200 ${
              isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">拖放图片到此处，或点击选择文件</p>
            <p className="text-xs text-gray-400 mt-1">单张上限 10MB，支持 JPG/PNG/WebP</p>
          </div>
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">已上传图片</h2>
                  <Button variant="outline" size="sm" onClick={handleRemoveAllFiles}>
                    清空
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <img
                        src={file.preview || "/placeholder.svg"}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
        <TabsContent value="settings" className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ImageFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image/jpeg">JPEG</SelectItem>
                <SelectItem value="image/png">PNG</SelectItem>
                <SelectItem value="image/webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>目标体积</Label>
            <RadioGroup value={targetSize.toString()} onValueChange={(value) => setTargetSize(Number.parseInt(value))}>
              <div className="flex space-x-2">
                <RadioGroupItem value="10" id="size-10" />
                <Label htmlFor="size-10">10KB</Label>
              </div>
              <div className="flex space-x-2">
                <RadioGroupItem value="20" id="size-20" />
                <Label htmlFor="size-20">20KB</Label>
              </div>
              <div className="flex space-x-2">
                <RadioGroupItem value="30" id="size-30" />
                <Label htmlFor="size-30">30KB</Label>
              </div>
              <div className="flex space-x-2">
                <RadioGroupItem value="40" id="size-40" />
                <Label htmlFor="size-40">40KB</Label>
              </div>
              <div className="flex space-x-2">
                <RadioGroupItem value="50" id="size-50" />
                <Label htmlFor="size-50">50KB</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>输出分辨率</Label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="width">宽度</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="自动"
                  value={width}
                  onChange={(e) => setWidth(e.target.value ? Number.parseInt(e.target.value) : "")}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="height">高度</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="自动"
                  value={height}
                  onChange={(e) => setHeight(e.target.value ? Number.parseInt(e.target.value) : "")}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>初始质量（用于估算体积）</Label>
            <Slider
              value={[quality]}
              onValueChange={(value) => setQuality(value[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              {quality}%（若目标体积更小，系统会自动继续降低质量）
            </p>
          </div>
        </TabsContent>
        <TabsContent value="results" className="p-6">
          {compressedImages.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">压缩结果</h2>
                <Button onClick={handleDownloadAll} variant="outline">
                  <Download className="mr-2 h-4 w-4" /> 全部下载
                </Button>
              </div>
              {compressedImages.map((image) => (
                <div key={image.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <p className="font-medium mb-2">原图</p>
                      <img
                        src={image.originalPreview || "/placeholder.svg"}
                        alt="Original"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                    <div className="w-1/2">
                      <p className="font-medium mb-2">压缩后</p>
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt="Compressed"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p>原图: {(image.originalSize / 1024).toFixed(2)} KB</p>
                      <p>压缩后: {(image.compressedSize / 1024).toFixed(2)} KB</p>
                      <p>节省: {((1 - image.compressedSize / image.originalSize) * 100).toFixed(2)}%</p>
                    </div>
                    <Button onClick={() => handleDownload(image)} variant="outline">
                      <Download className="mr-2 h-4 w-4" /> 下载
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">暂无压缩结果</h3>
              <p className="mt-1 text-sm text-gray-500">先上传图片并开始压缩。</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
        <Button onClick={handleCompress} disabled={files.length === 0 || isCompressing}>
          {isCompressing ? "压缩中..." : "开始压缩"}
        </Button>
      </div>
    </div>
  )
}

