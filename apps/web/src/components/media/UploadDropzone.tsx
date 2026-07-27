"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useRef, useState } from "react";
import { UploadCloud, FolderUp, FileUp, CheckCircle, AlertCircle, Loader2, RotateCcw } from "lucide-react";

interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png", ".webp"];

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isValidMediaFile(file: File): boolean {
  if (file.type && (file.type.startsWith("video/") || file.type.startsWith("image/"))) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function UploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const saveAssetLocally = (asset: any, autoPost?: any) => {
    if (typeof window === "undefined") return;

    // 1. Save uploaded asset to local storage for immediate UI reactivity
    try {
      const stored = localStorage.getItem("amai_uploaded_assets");
      const list = stored ? JSON.parse(stored) : [];
      const updatedList = [asset, ...list.filter((a: any) => a.id !== asset.id)];
      localStorage.setItem("amai_uploaded_assets", JSON.stringify(updatedList));
    } catch {}

    // 2. Trigger AutoPilot automation workflow
    if (autoPost) {
      try {
        const isAutopilotOn = localStorage.getItem("amai_autopilot_enabled") === "true";
        const key = isAutopilotOn ? "amai_scheduled_posts" : "amai_approval_queue_posts";
        const storedPosts = localStorage.getItem(key);
        const postList = storedPosts ? JSON.parse(storedPosts) : [];
        postList.unshift(autoPost);
        localStorage.setItem(key, JSON.stringify(postList));
      } catch {}
    }
  };

  const processSingleUpload = async (item: UploadItem, batchId?: string, batchName?: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 30 } : i))
    );

    let uploadSuccess = false;
    let uploadedAsset: any = null;
    let autoPostPayload: any = null;

    // 1. Try Vercel Blob Client upload
    try {
      const res = await upload(item.relativePath, item.file, {
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
      uploadedAsset = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        filename: item.file.name,
        mimeType: item.file.type || "image/jpeg",
        sizeBytes: item.file.size,
        blobUrl: res.url,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
    } catch (blobErr) {
      console.warn("[UploadDropzone] Vercel Blob client unconfigured, switching to direct upload API...", blobErr);
    }

    // 2. Direct Upload API Fallback
    if (!uploadSuccess) {
      try {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: 65 } : i))
        );

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
          const data = await res.json();
          uploadSuccess = true;
          uploadedAsset = data.asset || {
            id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            filename: item.file.name,
            mimeType: item.file.type || "image/jpeg",
            sizeBytes: item.file.size,
            blobUrl: URL.createObjectURL(item.file),
            status: "PENDING",
            createdAt: new Date().toISOString(),
          };
          autoPostPayload = data.autoPost;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${res.status}: ${res.statusText}`);
        }
      } catch (directErr) {
        const errorText = directErr instanceof Error ? directErr.message : "Media upload failed. Please try again.";
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: errorText,
                }
              : i
          )
        );
      }
    }

    if (uploadSuccess && uploadedAsset) {
      saveAssetLocally(uploadedAsset, autoPostPayload);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "done", progress: 100 } : i))
      );
      onUploaded?.();
    }
  };

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
        await processSingleUpload(item, batchId, batchName);
      }
    },
    [onUploaded]
  );

  function handleFileInput(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList)
      .filter(isValidMediaFile)
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
        className={`rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
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
          accept="video/*,image/*,.mp4,.mov,.webm,.mkv,.jpg,.jpeg,.png,.webp"
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
              <span className="truncate max-w-[50%] font-mono font-semibold text-slate-900 dark:text-white">
                {item.relativePath}
              </span>

              {item.status === "uploading" && (
                <span className="text-amber-500 font-bold flex items-center space-x-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading {item.progress}%</span>
                </span>
              )}

              {item.status === "done" && (
                <span className="text-emerald-500 font-bold flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Uploaded Successfully</span>
                </span>
              )}

              {item.status === "error" && (
                <div className="flex items-center space-x-2">
                  <span className="text-rose-500 font-semibold flex items-center space-x-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.error}</span>
                  </span>
                  <button
                    onClick={() => processSingleUpload(item)}
                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center space-x-1"
                    title="Retry Upload"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {item.status === "queued" && (
                <span className="text-slate-400 font-semibold">Queued...</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
