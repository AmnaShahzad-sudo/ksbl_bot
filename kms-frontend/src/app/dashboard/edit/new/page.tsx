"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  AlertTriangle,
  Loader2
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://ksbl-bot.onrender.com/v1";

export default function CreateFilePage() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!filename.trim()) {
      setError("Filename is required.");
      return;
    }
    if (!content.trim()) {
      setError("File content cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    const key = localStorage.getItem("ksbl_api_key");

    // Clean up filename: ensure it has an extension (default to .txt if none provided)
    let finalFilename = filename.trim();
    if (!finalFilename.includes(".")) {
      finalFilename += ".txt";
    }

    try {
      await axios.put(`${API_BASE}/admin/files/${encodeURIComponent(finalFilename)}/content`, {
        content: content
      }, {
        headers: { "X-API-KEY": key }
      });
      alert(`File "${finalFilename}" created and ingested successfully.`);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save new file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 animate-in fade-in duration-300">
      {/* Editor Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#002554]" />
              <h1 className="text-lg font-bold text-[#002554]">Create New File</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Editor Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[#002554] hover:bg-[#001f46] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Sync
          </button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 p-8 overflow-hidden flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filename</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g. admission_faq.txt"
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002554]/20 focus:border-[#002554] text-slate-700 font-medium"
          />
          <p className="text-[10px] text-slate-400">If no file extension is specified, `.txt` will be automatically appended.</p>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raw Text Content</span>
            <span className="text-[10px] font-medium text-slate-400">{content.length} characters</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full p-6 text-slate-700 font-mono text-sm resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
            placeholder="Start typing your knowledge base content here..."
          />
        </div>
        
        <div className="flex items-center gap-2 text-[#002554] bg-[#002554]/5 p-3 rounded-xl border border-[#002554]/10">
          <AlertTriangle className="w-4 h-4 text-[#002554]" />
          <p className="text-xs font-semibold text-[#002554]">Saving will automatically update the AI's vector database. This may take a few seconds to reflect.</p>
        </div>
      </div>
    </div>
  );
}
