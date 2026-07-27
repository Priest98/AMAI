"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useRef, useState } from "react";
import { UploadCloud, FolderUp, FileUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function UploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: { file: File; relativePath: string }[]) => {
      const isBatch = files.length > 1;
      const batchId = isBatch ? generateBatchId() : undefined;
      const batchName = isBatch ? `Upload ${new Date().toLocaleString()}` : undefined;

      const newItems: UploadItem[] = files.map((f) => ({
        id: `${f.file.name}_${Math.random().toString(36).slice(2, 8)}`,
        file: f.file,
        relativePath: f.relativePath,
        progress: 0,
        status: "queued",
      }));

      setItems((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 20 } : i))
        );

        let uploadSuccess = false;

        // 1. Try Vercel Blob Client upload
        try {
          await upload(item.relativePath, item.file, {
            access: "public",
            handleUploadUrl: "/api/media/upload",
            clientPayload: JSON.stringify({
              batchId,
              batchName,
              relativePath: item.relativePath,
            }),
            onUploadProgress: ({ percentage }) => {
              setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, progress: percentage } : i))
              );
            },
          });
          uploadSuccess = true;
        } catch (blobErr) {
          console.warn("[UploadDropzone] Vercel Blob token upload failed, trying direct upload fallback...", blobErr);
        }

        // 2. Direct Upload Fallback if Blob token is missing or failed
        if (!uploadSuccess) {
          try {
            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("relativePath", item.relativePath);
            if (batchId) formData.append("batchId", batchId);
            if (batchName) formData.append("batchName", batchName);

            const res = await fetch("/api/media/direct-upload", {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              uploadSuccess = true;
            } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || "Direct upload failed");
            }
          } catch (directErr) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: "error",
                      error: directErr instanceof Error ? directErr.message : "Upload failed",
                    }
                  : i
              )
            );
          }
        }

        if (uploadSuccess) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: "done", progress: 100 } : i))
          );
        }
      }

      onUploaded?.();
    },
    [onUploaded]
  );

  function handleFileInput(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList)
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .map((f) => ({
        file: f,
        relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      }));

    if (files.length > 0) uploadFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFileInput(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
          isDragging 
            ? "border-rose-500 bg-rose-500/5 dark:bg-rose-500/10" 
            : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-950/40 hover:border-slate-300 dark:hover:border-white/20"
        }`}
      >
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
          Drag and drop videos or photos here
        </p>
        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500 mb-4">
          Supports MP4, MOV, WebM, JPEG, PNG, WebP (Up to 500MB per file)
        </p>

        <div className="flex flex-wrap justify-center items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition flex items-center space-x-1.5 touch-target btn-emerald-cta"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Choose Files</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 transition flex items-center space-x-1.5 touch-target btn-gold-cta"
          >
            <FolderUp className="h-3.5 w-3.5" />
            <span>Choose Folder</span>
          </button>
        </div>

        {/* Individual file picker */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFileInput(e.target.files)}
        />

        {/* Folder picker */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is standard browser feature for folder picks
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => handleFileInput(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12151D] px-4 py-3 text-xs"
            >
              <span className="truncate max-w-[60%] font-mono font-semibold text-slate-900 dark:text-white">
                {item.relativePath}
              </span>
              {item.status === "uploading" && (
                <span className="text-amber-500 font-bold flex items-center space-x-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{item.progress}%</span>
                </span>
              )}
              {item.status === "done" && (
                <span className="text-emerald-500 font-bold flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Uploaded</span>
                </span>
              )}
              {item.status === "error" && (
                <span className="text-rose-500 font-bold flex items-center space-x-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{item.error}</span>
                </span>
              )}
              {item.status === "queued" && (
                <span className="text-slate-400 font-semibold">Waiting…</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
