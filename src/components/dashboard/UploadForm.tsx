"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const router = useRouter();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      setMessage({ text: "Please select a valid PDF file.", isError: true });
      setUploading(false);
      return;
    }

    try {
    
      const response = await fetch("/api/transactions/upload", {
        method: "POST",
        body: formData, 
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.error || "Processing failed.", isError: true });
      } else {
        setMessage({ text: data.message || "Upload successful!", isError: false });
        router.refresh(); 
      }
    } catch (err) {
      setMessage({ text: "Network connection or file streaming interrupted.", isError: true });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <input 
        type="file" 
        name="file"
        accept=".pdf"
        required
        disabled={uploading}
        className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:border file:border-white/10 file:bg-black file:text-white file:text-xs file:font-mono hover:file:bg-zinc-900 file:cursor-pointer disabled:opacity-50"
      />
      <button 
        type="submit" 
        disabled={uploading}
        className="w-full bg-brand-white text-brand-black font-medium text-sm py-2.5 px-4 hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Analyzing with Groq..." : "Parse & Auto-Commit File →"}
      </button>
      {message && (
        <div className={`p-3 text-xs font-mono border ${message.isError ? "bg-red-950/30 border-red-900 text-red-400" : "bg-mint-950/30 border-mint-900 text-mint-400"}`}>
          {message.text}
        </div>
      )}
    </form>
  );
}