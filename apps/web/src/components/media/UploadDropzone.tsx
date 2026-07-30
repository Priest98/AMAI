"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  UploadCloud, FolderUp, FileUp, CheckCircle, AlertCircle, Loader2, RotateCcw, X, Circle, CheckCircle2,
} from "lucide-react";
import { API_BASE, getBrandId, getToken } from "@/lib/api";
import { useEngineEvents } from "@/lib/useEngineEvents";

interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  progress: number;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  error?: string;
  assetId?: string;
  /** Latest AMAI Engine stage reached, driven by live SSE events for this asset. */
  stage: StageKey;
  terminal?: "approval" | "scheduled";
  controller?: AbortController;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
]);
// Vercel Blob client-direct-upload bypasses the ~4.5MB serverless body-size
// ceiling entirely, so this is now a generous sanity limit rather than a
// platform constraint.
const MAX_SIZE_BYTES = 500 * 1024 * 1024;
// How many files upload+register+trigger concurrently. Registration is now
// fast (it no longer waits on the AI pipeline — see MediaService.createAssetRecord)
// and AMAI processing runs as its own decoupled request, so there's no
// reason to force every file through one at a time anymore. Capped rather
// than fully unbounded so a 35-file batch doesn't open 35 simultaneous Blob
// transfers on the user's connection at once.
const UPLOAD_CONCURRENCY = 3;

const STAGE_ORDER = ["uploaded", "analyzing", "caption", "hashtags", "scheduling", "done"] as const;
type StageKey = typeof STAGE_ORDER[number] | "idle";

const STAGE_LABEL: Record<Exclude<StageKey, "idle">, string> = {
  uploaded: "Upload complete",
  analyzing: "AMAI Engine analyzing media…",
  caption: "Generating caption…",
  hashtags: "Generating hashtags…",
  scheduling: "Calculating content score & best posting time…",
  done: "Workflow complete",
};

function isValidMediaFile(file: File): { ok: boolean; reason?: string } {
  const typeOk = file.type
    ? ALLOWED_MIME_TYPES.has(file.type.toLowerCase())
    : ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!typeOk) {
    return { ok: false, reason: "Unsupported file type. Allowed: JPG, PNG, GIF, WEBP images and MP4, MOV, WebM, MKV videos." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, reason: `File is too large (max ${MAX_SIZE_BYTES / (1024 * 1024)}MB).` };
  }
  return { ok: true };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function friendlyUploadError(err: any): string {
  if (err?.name === "AbortError") return "Upload cancelled.";
  if (err instanceof TypeError || /fetch|network/i.test(err?.message || "")) {
    return "Upload failed due to a network interruption. Please try again.";
  }
  return err?.message || "Upload failed. Please try again.";
}

/**
 * Uploads directly from the browser to Vercel Blob storage (bypassing the
 * serverless function's ~4.5MB request-body cap that was rejecting videos
 * with a platform-level 413), then registers the resulting blob as a
 * MediaAsset via the lightweight JSON /media/register endpoint. Both the
 * Blob upload and the register call accept an AbortSignal so a queued item
 * can be cancelled mid-flight from the UI.
 */
async function uploadAndRegister(
  file: File,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<any> {
  const brandId = getBrandId();
  const token = getToken();
  if (!token) throw new Error("You are not signed in. Please log in and try again.");

  const pathname = `${brandId}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/media-upload-token",
    headers: { Authorization: `Bearer ${token}` },
    abortSignal: signal,
    onUploadProgress: (progressEvent) => {
      onProgress(Math.round(progressEvent.percentage));
    },
  });

  const res = await fetch(`${API_BASE}/brands/${brandId}/media/register`, {
    method: "POST",
    signal,
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
    if (res.status === 401) throw new Error("Your session has expired. Please sign in again.");
    const message = body?.message
      ? (Array.isArray(body.message) ? body.message.join(", ") : body.message)
      : "Upload succeeded but registering the file failed.";
    throw new Error(message);
  }

  return body;
}

/** Fires the AMAI Engine's processing pipeline for a just-registered asset.
 * Deliberately a separate request from register() — see MediaService's
 * createAssetRecord/triggerProcessing for why. Not awaited by the upload
 * queue loop (so the next file can start immediately); its own resolution
 * is used purely to catch the case where the request itself never made it
 * (network drop) since the live stage checklist otherwise comes from SSE. */
async function triggerProcessing(brandId: string, assetId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/media/assets/${assetId}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const message = body?.message || "AMAI Engine failed to start for this file.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return body;
}

const EVENT_TYPE_TO_STAGE: Record<string, StageKey> = {
  ANALYSIS_STARTED: "analyzing",
  CAPTION_GENERATED: "caption",
  HASHTAGS_GENERATED: "hashtags",
  BEST_TIME_DETERMINED: "scheduling",
  AUTO_SCHEDULED: "done",
  APPROVAL_QUEUED: "done",
};

function StageChecklist({ item }: { item: UploadItem }) {
  if (item.status !== "processing" && item.status !== "done") return null;
  const currentIndex = STAGE_ORDER.indexOf(item.stage === "idle" ? "uploaded" : item.stage);
  return (
    <ul className="mt-1.5 space-y-0.5">
      {STAGE_ORDER.map((stage, i) => {
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex && item.status === "processing";
        return (
          <li key={stage} className="flex items-center space-x-1.5 text-[10px]">
            {reached && !isCurrent ? (
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
            ) : isCurrent ? (
              <Loader2 className="h-2.5 w-2.5 text-amber-500 animate-spin shrink-0" />
            ) : (
              <Circle className="h-2.5 w-2.5 text-slate-300 dark:text-zinc-700 shrink-0" />
            )}
            <span className={reached ? "text-slate-600 dark:text-zinc-300" : "text-slate-350 dark:text-zinc-600"}>
              {stage === "done"
                ? (item.terminal === "scheduled" ? "Scheduled successfully ✓" : "Moved to Approval Queue ✓")
                : STAGE_LABEL[stage]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function UploadDropzone({ onUploaded }: { onUploaded?: (asset: any) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Single shared SSE subscription for every in-flight item — routes each
  // incoming engine.activity event to whichever queued item's assetId it
  // matches, driving the live stage checklist without any polling.
  useEngineEvents((event) => {
    if (!event.mediaAssetId) return;
    const stage = EVENT_TYPE_TO_STAGE[event.type];
    if (!stage) return;
    setItems((prev) => prev.map((i) => {
      if (i.assetId !== event.mediaAssetId) return i;
      const isTerminal = stage === "done";
      return {
        ...i,
        stage,
        status: isTerminal ? "done" : "processing",
        terminal: event.type === "AUTO_SCHEDULED" ? "scheduled" : i.terminal,
      };
    }));
  });

  const processSingleUpload = async (item: UploadItem) => {
    const controller = new AbortController();
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 0, error: undefined, controller, stage: "idle" } : i)));

    try {
      const asset = await uploadAndRegister(
        item.file,
        (pct) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))),
        controller.signal,
      );

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "processing", progress: 100, assetId: asset.id, stage: "uploaded" } : i)));
      onUploaded?.(asset);

      // Fire-and-track, not fire-and-forget: errors here (the request
      // itself failing to go out, e.g. network drop right after upload)
      // still surface in the UI with a retry option. The actual AMAI
      // Engine progress is reported live via the SSE handler above, not
      // by awaiting this — that's what lets uploads run at real
      // concurrency instead of queuing behind AI processing time.
      const token = getToken();
      if (token) {
        triggerProcessing(getBrandId(), asset.id, token).catch((err) => {
          setItems((prev) => prev.map((i) => (i.id === item.id && i.status !== "done" ? { ...i, status: "error", error: err?.message || "AMAI Engine failed to start." } : i)));
        });
      }
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: friendlyUploadError(err) } : i))
      );
    }
  };

  const uploadFiles = useCallback(
    async (files: { file: File; relativePath: string }[]) => {
      const newItems: UploadItem[] = [];
      for (const f of files) {
        const check = isValidMediaFile(f.file);
        newItems.push({
          id: `${f.file.name}_${Math.random().toString(36).slice(2, 8)}`,
          file: f.file,
          relativePath: f.relativePath,
          progress: 0,
          status: check.ok ? "queued" : "error",
          error: check.ok ? undefined : check.reason,
          stage: "idle",
        });
      }

      setItems((prev) => [...prev, ...newItems]);

      const queue = newItems.filter((i) => i.status === "queued");
      let cursor = 0;
      const worker = async () => {
        while (cursor < queue.length) {
          const next = queue[cursor];
          cursor += 1;
          await processSingleUpload(next);
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker));
    },
    [onUploaded]
  );

  const cancelUpload = (item: UploadItem) => {
    item.controller?.abort();
  };

  const retryProcessing = async (item: UploadItem) => {
    if (!item.assetId) return processSingleUpload(item); // never even registered — redo the whole upload
    const token = getToken();
    if (!token) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "processing", error: undefined, stage: "uploaded" } : i)));
    try {
      await triggerProcessing(getBrandId(), item.assetId, token);
    } catch (err: any) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: err?.message || "AMAI Engine failed to start." } : i)));
    }
  };

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
          Supports MP4, MOV, WebM, MKV, JPEG, PNG, WebP, GIF (up to 500MB per file)
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
          accept="video/*,image/*,.mp4,.mov,.webm,.mkv,.jpg,.jpeg,.png,.webp,.gif"
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
              className="flex items-start justify-between rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12151D] px-4 py-3 text-xs gap-3"
            >
              <div className="min-w-0 flex-1">
                <span className="truncate block max-w-full font-mono font-semibold text-slate-900 dark:text-white">
                  {item.relativePath}
                </span>
                <StageChecklist item={item} />
              </div>

              <div className="shrink-0 flex items-center space-x-2">
                {item.status === "uploading" && (
                  <>
                    <span className="text-amber-500 font-bold flex items-center space-x-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading {item.progress}%</span>
                    </span>
                    <button
                      onClick={() => cancelUpload(item)}
                      className="p-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-400"
                      title="Cancel upload"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                {item.status === "processing" && (
                  <span className="text-sky-500 font-bold flex items-center space-x-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing</span>
                  </span>
                )}

                {item.status === "done" && (
                  <span className="text-emerald-500 font-bold flex items-center space-x-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{item.terminal === "scheduled" ? "Scheduled" : "In Approval Queue"}</span>
                  </span>
                )}

                {item.status === "error" && (
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-red-500 font-semibold flex items-center space-x-1 min-w-0">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[160px]">{item.error}</span>
                    </span>
                    <button
                      onClick={() => retryProcessing(item)}
                      className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] flex items-center space-x-1 shrink-0"
                      title="Retry"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {item.status === "queued" && (
                  <span className="text-slate-400 font-semibold">Queued…</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
