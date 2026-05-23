"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertTriangle, Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "selected"; file: File }
  | { status: "uploading"; file: File }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadForm() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const inputRef          = useRef<HTMLInputElement>(null);
  const router            = useRouter();

  function validate(file: File): string | null {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf"))
      return "Only PDF files are accepted.";
    if (file.size > 10 * 1024 * 1024)
      return "File exceeds 10 MB limit.";
    return null;
  }

  function pick(file: File) {
    const err = validate(file);
    if (err) { setState({ status: "error", message: err }); return; }
    setState({ status: "selected", file });
  }

  const onDragOver  = useCallback((e: DragEvent) => { e.preventDefault(); setState({ status: "dragging" }); }, []);
  const onDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setState({ status: "idle" }); }, []);
  const onDrop      = useCallback((e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }, []);
  const onInput     = useCallback((e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) pick(f); if (inputRef.current) inputRef.current.value = ""; }, []);

  async function handleUpload() {
    if (state.status !== "selected") return;
    const file = state.file;
    setState({ status: "uploading", file });

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch("/api/transactions/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error || "Processing failed." });
      } else {
        setState({ status: "success", message: data.message || "Upload successful!" });
        router.refresh();
      }
    } catch {
      setState({ status: "error", message: "Network error — check connection and retry." });
    }
  }

  const idle      = state.status === "idle" || state.status === "dragging";
  const dragging  = state.status === "dragging";

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Drop zone */}
      {idle && (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`border-2 border-dashed cursor-pointer p-6 text-center space-y-3 transition-colors select-none
            ${dragging ? "border-accent/60 bg-accent/5" : "border-border hover:border-border/60 hover:bg-surface"}`}
        >
          <div className="flex justify-center">
            <div className={`p-3 border transition-colors ${dragging ? "border-accent/40 bg-accent/10" : "border-border bg-muted"}`}>
              <Upload className={`w-5 h-5 ${dragging ? "text-accent" : "text-muted-foreground"}`} />
            </div>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${dragging ? "text-accent" : "text-muted-foreground"}`}>
              {dragging ? "Release to stage document" : "Drop passbook PDF here"}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">or click to browse</p>
          </div>
          <input ref={inputRef} type="file" accept=".pdf" onChange={onInput} className="sr-only" aria-hidden />
        </div>
      )}

      {/* File selected */}
      {state.status === "selected" && (
        <div className="panel p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-muted border border-border shrink-0">
                <FileText className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-sans font-medium text-foreground truncate">{state.file.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(state.file.size)} · PDF</p>
              </div>
            </div>
            <button onClick={() => setState({ status: "idle" })} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-background border border-input p-3 space-y-1">
            <p className="data-label mb-1">Pre-flight Checks</p>
            {["Ensure document is not password-protected", "Supports HDFC, ICICI, SBI, Axis, Kotak formats", "Streamed directly to Groq extraction pipeline"].map((n) => (
              <p key={n} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                <span className="text-accent shrink-0 mt-0.5">›</span>{n}
              </p>
            ))}
          </div>
          <button onClick={handleUpload} className="btn-primary gap-2">
            <Cpu className="w-3.5 h-3.5" /> Invoke Groq Parser
          </button>
        </div>
      )}

      {/* Uploading */}
      {state.status === "uploading" && (
        <div className="panel p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-accent font-bold">Groq Extraction Running</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Parsing {state.file.name}…</p>
          </div>
        </div>
      )}

      {/* Success */}
      {state.status === "success" && (
        <div className="border border-positive/20 bg-positive/5 p-4 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-positive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-positive font-bold">Ingestion Complete</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{state.message}</p>
          </div>
          <button onClick={() => setState({ status: "idle" })} className="text-[10px] text-accent hover:text-accent/70 uppercase tracking-wide transition-colors">
            Parse Another
          </button>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="border border-negative/20 bg-negative/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-negative shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-negative font-bold">Parse Error</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{state.message}</p>
            </div>
          </div>
          <button onClick={() => setState({ status: "idle" })} className="w-full border border-border text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground py-1.5 transition-colors">
            Retry Upload
          </button>
        </div>
      )}

      {idle && (
        <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
          PDF · Max 10 MB · Unencrypted only
        </p>
      )}
    </div>
  );
}