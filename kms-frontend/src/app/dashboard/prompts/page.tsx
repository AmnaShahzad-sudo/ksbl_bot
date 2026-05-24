"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Edit3, 
  CheckCircle2
} from "lucide-react";

const API_BASE = "https://ksbl-bot.onrender.com/v1";

interface PromptData {
  filename: string;
  size: number;
  last_modified: string;
}

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const fetchPrompts = async () => {
    setLoading(true);
    const key = localStorage.getItem("ksbl_api_key");
    try {
      const response = await axios.get(`${API_BASE}/admin/prompts`, {
        headers: { "X-API-KEY": key }
      });
      setPrompts(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch prompts.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const filteredPrompts = prompts.filter(p => 
    p.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#002554] tracking-tight">System Prompts</h1>
          <p className="text-slate-500 text-sm mt-1">Configure how the AI behaves and responds.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchPrompts}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-[#002554]" : "text-slate-500"}`} />
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-[#002554]/10 flex items-center justify-center text-[#002554]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Prompts</p>
            <p className="text-xl font-bold text-slate-800">{prompts.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search prompts..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002554]/20 focus:border-[#002554]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Prompt Name</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#002554]" />
                    Loading prompts...
                  </td>
                </tr>
              ) : filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    No prompts found.
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((prompt) => (
                  <tr key={prompt.filename} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#002554]/5 flex items-center justify-center text-[#002554]">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{prompt.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(prompt.last_modified).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => router.push(`/dashboard/edit/prompt/${encodeURIComponent(prompt.filename)}`)}
                          className="p-2 text-slate-400 hover:text-[#002554] hover:bg-[#002554]/5 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
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
