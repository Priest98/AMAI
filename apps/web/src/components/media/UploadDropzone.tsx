"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { UploadCloud, FolderUp, FileUp, CheckCircle, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { API_BASE, getBrandId, getToken } from "@/lib/api";

interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
// Vercel Blob client-direct-upload bypasses the ~4.5MB serverless body-size
// ceiling entirely, so this is now a generous sanity limit rather than a
// platform constraint.
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

function isValidMediaFile(file: File): { ok: boolean; reason?: string } {
  const typeOk = file.type
    ? file.type.startsWith("video/") || file.type.startsWith("image/")
    : ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!typeOk) return { ok: false, reason: "Unsupported file type — only images and videos are allowed." };
  if (file.size > MAX_SIZE_BYTES) return { ok: false, reason: `File is too large (max ${MAX_SIZE_BYTES / (1024 * 1024)}MB).` };
  return { ok: true };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Uploads directly from the browser to Vercel Blob storage (bypassing the
 * serverless function's ~4.5MB request-body cap that was rejecting videos
 * with a platform-level 413), then registers the resulting blob as a
 * MediaAsset via the lightweight JSON /media/register endpoint so the
 * AMAI Engine picks it up exactly like it does for the legacy small-file path.
 */
async function uploadAndRegister(
  file: File,
  onProgress: (pct: number) => void
): Promise<any> {
  const brandId = getBrandId();
  const token = getToken();
  if (!token) throw new Error("You are not signed in. Please log in and try again.");

  const pathname = `${brandId}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/media-upload-token",
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: (progressEvent) => {
      onProgress(Math.round(progressEvent.percentage));
    },
  });

  const res = await fetch(`${API_BASE}/brands/${brandId}/media/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: blob.url,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      filename: file.name,
    }),
  });

  let body: any = null;
  try { body = await res.json(); } catch {}

  if (!res.ok) {
    const message = body?.message
      ? (Array.isArray(body.message) ? body.message.join(", ") : body.message)
      : "Upload succeeded but registering the file failed.";
    throw new Error(message);
  }

  return body;
}

export default function UploadDropzone({ onUploaded }: { onUploaded?: (asset: any) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processSingleUpload = async (item: UploadItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 0, error: undefined } : i)));

    try {
      const body = await uploadAndRegister(item.file, (pct) => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)));
      });

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "done", progress: 100 } : i)));
      onUploaded?.(body);
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: err?.message || "Upload failed. Please try again." } : i))
      );
    }
  };

  const uploadFiles = useCallback(
    async (files: { file: File; relativePath: string }[]) => {
      const newItems: UploadItem[] = [];
      for (const f of files) {
        const check = isValidMediaFile(f.file);
        if (!check.ok) {
          newItems.push({
            id: `${f.file.name}_${Math.random().toString(36).slice(2, 8)}`,
            file: f.file,
            relativePath: f.relativePath,
            progress: 0,
            status: "error",
            error: check.reason,
          });
        } else {
          newItems.push({
            id: `${f.file.name}_${Math.random().toString(36).slice(2, 8)}`,
            file: f.file,
            relativePath: f.relativePath,
            progress: 0,
            status: "queued",
          });
        }
      }

      setItems((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        if (item.status === "queued") await processSingleUpload(item);
      }
    },
    [onUploaded]
  );

  function handleFileInput(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).map((f) => ({
      file: f,
      relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    }));
    uploadFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFileInput(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-violet-500 bg-violet-500/5 dark:bg-violet-500/10"
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
          Supports MP4, MOV, WebM, JPEG, PNG, WebP (up to 500MB per file)
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

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,.mp4,.mov,.webm,.mkv,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => { handleFileInput(e.target.files); e.target.value = ''; }}
        />

        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is a standard browser feature for folder picks
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => { handleFileInput(e.target.files); e.target.value = ''; }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12151D] px-4 py-3 text-xs gap-3"
            >
              <span className="truncate max-w-[45%] font-mono font-semibold text-slate-900 dark:text-white">
                {item.relativePath}
              </span>

              {item.status === "uploading" && (
                <span className="text-amber-500 font-bold flex items-center space-x-1.5 shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading {item.progress}%</span>
                </span>
              )}

              {item.status === "done" && (
                <span className="text-emerald-500 font-bold flex items-center space-x-1 shrink-0">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Uploaded — AMAI Engine is on it</span>
                </span>
              )}

              {item.status === "error" && (
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-red-500 font-semibold flex items-center space-x-1 min-w-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.error}</span>
                  </span>
                  <button
                    onClick={() => processSingleUpload(item)}
                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] flex items-center space-x-1 shrink-0"
                    title="Retry Upload"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {item.status === "queued" && (
                <span className="text-slate-400 font-semibold shrink-0">Queued…</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
