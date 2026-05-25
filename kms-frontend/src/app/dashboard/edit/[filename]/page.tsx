"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  AlertTriangle,
  Loader2
} from "lucide-react";

const API_BASE =  "https://ksbl-bot.onrender.com/v1";

export default function EditFilePage() {
  const router = useRouter();
  const params = useParams();
  const filename = params.filename as string;
  
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContent = async () => {
      const key = localStorage.getItem("ksbl_api_key");
      try {
        const response = await axios.get(`${API_BASE}/admin/files/${filename}/content`, {
          headers: { "X-API-KEY": key }
        });
        setContent(response.data.content);
      } catch (err) {
        setError("Failed to load file content.");
      } finally {
        setLoading(false);
      }
    };

    if (filename) fetchContent();
  }, [filename]);

  const handleSave = async () => {
    setSaving(true);
    const key = localStorage.getItem("ksbl_api_key");
    try {
      await axios.put(`${API_BASE}/admin/files/${filename}/content`, {
        content: content
      }, {
        headers: { "X-API-KEY": key }
      });
      alert("File updated and re-ingested successfully.");
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-ksbl-navy" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
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
              <FileText className="w-4 h-4 text-ksbl-navy" />
              <h1 className="text-lg font-bold text-slate-800">{decodeURIComponent(filename)}</h1>
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
            className="flex items-center gap-2 px-6 py-2 bg-ksbl-navy hover:bg-ksbl-navy-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Sync
          </button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 p-8 overflow-hidden flex flex-col gap-4">
        {error ? (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
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
        )}
        
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-xs font-medium">Saving will automatically update the AI's vector database. This may take a few seconds to reflect.</p>
        </div>
      </div>
    </div>
  );
}
