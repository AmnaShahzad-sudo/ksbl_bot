"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [role, setRole] = useState("super_admin");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("ksbl_api_key", apiKey.trim());
      localStorage.setItem("ksbl_user_role", role);
      router.push("/dashboard");
    } else {
      setError("Please enter a valid API Key");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-ksbl-navy rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-slate-200">
            <ShieldCheck className="text-ksbl-gold w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">KSBL Knowledge Admin</h1>
          <p className="text-slate-500 mt-2">Secure access to Knowledge Base</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="block w-full px-4 py-3 border border-slate-200 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-ksbl-navy/20 focus:border-ksbl-navy sm:text-sm transition-all text-slate-700 font-medium"
            >
              <option value="super_admin">Super Admin (All Access)</option>
              <option value="normal_admin">Normal Admin (Manage Files Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Admin API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ksbl-navy/20 focus:border-ksbl-navy sm:text-sm transition-all"
                placeholder="Enter your security token"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-ksbl-navy hover:bg-[#001c40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ksbl-navy transition-all active:scale-[0.98]"
          >
            Access Dashboard
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Karachi School of Business and Leadership &copy; 2024
        </p>
      </div>
    </div>
  );
}

