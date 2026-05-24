"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type State =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "selected"; file: File }
  | { status: "uploading"; file: File }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export default function UploadForm() {
  const [s, setS] = useState<State>({ status: "idle" });
  const inputRef  = useRef<HTMLInputElement>(null);
  const router    = useRouter();

  function pick(file: File) {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf"))
      return setS({ status: "error", message: "Only PDF files are accepted." });
    if (file.size > 10 * 1024 * 1024)
      return setS({ status: "error", message: "File exceeds 10 MB limit." });
    setS({ status: "selected", file });
  }

  const onDragOver  = useCallback((e: DragEvent) => { e.preventDefault(); setS({ status: "dragging" }); }, []);
  const onDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setS({ status: "idle" }); }, []);
  const onDrop      = useCallback((e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }, []);
  const onInput     = useCallback((e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) pick(f); if (inputRef.current) inputRef.current.value = ""; }, []);

  async function upload() {
    if (s.status !== "selected") return;
    const file = s.file;
    setS({ status: "uploading", file });
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/transactions/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setS({ status: "error", message: data.error || "Processing failed." });
      } else {
        setS({ status: "success", message: data.message || "Upload successful!" });
        router.refresh();
      }
    } catch {
      setS({ status: "error", message: "Network error — check connection." });
    }
  }

  const idle     = s.status === "idle" || s.status === "dragging";
  const dragging = s.status === "dragging";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {idle && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className="rounded-xl p-6 text-center transition-all cursor-pointer select-none"
          style={{
            background:   dragging ? "hsl(var(--info-dim))" : "hsl(var(--surface-raised))",
            border:       `2px dashed ${dragging ? "hsl(var(--info) / 0.6)" : "hsl(var(--border))"}`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: dragging ? "hsl(var(--info) / 0.15)" : "hsl(var(--surface-overlay))",
              border:     `1px solid ${dragging ? "hsl(var(--info) / 0.4)" : "hsl(var(--border))"}`,
            }}
          >
            <Upload className="w-4 h-4" style={{ color: dragging ? "hsl(var(--info))" : "hsl(var(--foreground-tertiary))" }} />
          </div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: dragging ? "hsl(var(--info))" : "hsl(var(--foreground))" }}>
            {dragging ? "Release to upload" : "Drop PDF here"}
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            or click to browse · Max 10 MB
          </p>
          <input ref={inputRef} type="file" accept=".pdf" onChange={onInput} className="sr-only" />
        </div>
      )}

      {/* Selected */}
      {s.status === "selected" && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.3)" }}
            >
              <FileText className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{s.file.name}</p>
              <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                {fmtBytes(s.file.size)} · PDF
              </p>
            </div>
            <button onClick={() => setS({ status: "idle" })} className="btn-icon">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={upload} className="btn-primary w-full justify-center text-sm">
            Parse with Groq AI
          </button>
        </div>
      )}

      {/* Uploading */}
      {s.status === "uploading" && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.25)" }}
        >
          <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: "hsl(var(--info))" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Analyzing document…</p>
            <p className="text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>Groq extraction running</p>
          </div>
        </div>
      )}

      {/* Success */}
      {s.status === "success" && (
        <div
          className="rounded-xl p-4"
          style={{ background: "hsl(var(--positive-dim))", border: "1px solid hsl(var(--positive) / 0.25)" }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--positive))" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Ingestion complete</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground-secondary))" }}>{s.message}</p>
            </div>
            <button
              onClick={() => setS({ status: "idle" })}
              className="text-xs font-semibold hover:underline"
              style={{ color: "hsl(var(--positive))" }}
            >
              Parse another
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {s.status === "error" && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "hsl(var(--negative-dim))", border: "1px solid hsl(var(--negative) / 0.25)" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--negative))" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Upload failed</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground-secondary))" }}>{s.message}</p>
            </div>
          </div>
          <button onClick={() => setS({ status: "idle" })} className="btn-ghost w-full justify-center text-xs">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}