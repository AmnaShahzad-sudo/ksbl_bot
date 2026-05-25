"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  FilePlus, 
  Search, 
  RefreshCw, 
  FileText, 
  Trash2, 
  Edit3, 
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

const API_BASE =  "https://ksbl-bot.onrender.com/v1";

interface FileData {
  filename: string;
  size: number;
  last_modified: string;
  type: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fetchFiles = async () => {
    setLoading(true);
    const key = localStorage.getItem("ksbl_api_key");
    try {
      const response = await axios.get(`${API_BASE}/admin/files`, {
        headers: { "X-API-KEY": key }
      });
      setFiles(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch files. Please check your API key.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    
    const key = localStorage.getItem("ksbl_api_key");
    try {
      await axios.delete(`${API_BASE}/admin/files/${filename}`, {
        headers: { "X-API-KEY": key }
      });
      fetchFiles();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const key = localStorage.getItem("ksbl_api_key");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/admin/upload`, formData, {
        headers: { 
          "X-API-KEY": key,
          "Content-Type": "multipart/form-data"
        }
      });
      fetchFiles();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Upload failed.";
      alert(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-1">Manage documents that the AI uses for context.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-blue-100 transition-all active:scale-95">
            <FilePlus className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload New File"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <button 
            onClick={fetchFiles}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Stats/Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Documents", value: files.length, icon: FileText, color: "blue" },
          { label: "AI Status", value: "Active", icon: CheckCircle2, color: "green" },
          { label: "Last Sync", value: "Just now", icon: Clock, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search documents by name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Document Name</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading files...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    {searchQuery ? "No matching files found." : "No documents uploaded yet."}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr key={file.filename} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Ingested
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => router.push(`/dashboard/edit/${encodeURIComponent(file.filename)}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.filename)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
