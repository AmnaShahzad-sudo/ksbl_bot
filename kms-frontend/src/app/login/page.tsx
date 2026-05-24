"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Users } from "lucide-react";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [role, setRole] = useState("super"); // 'super' or 'normal'
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("ksbl_api_key", apiKey);
      localStorage.setItem("ksbl_role", role);
      router.push("/dashboard");
    } else {
      setError("Please enter a valid API Key");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-slate-900">
        <div className="flex flex-col items-center mb-8">
          <img src="/KSBL_Logo.png" alt="KSBL Logo" className="h-16 mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-[#002554]">KSBL Knowledge Admin</h1>
          <p className="text-slate-500 mt-2 text-sm">Secure access to Knowledge Base</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
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
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002554] focus:border-[#002554] sm:text-sm transition-all"
                placeholder="Enter your security token"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002554] focus:border-[#002554] sm:text-sm transition-all appearance-none cursor-pointer"
              >
                <option value="super">Super Admin</option>
                <option value="normal">Normal Admin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#002554] hover:bg-[#001f46] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002554] transition-all active:scale-[0.98]"
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
