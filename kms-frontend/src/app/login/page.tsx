"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@ksbl.edu.pk");
  const [apiKey, setApiKey] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (apiKey.trim()) {
      localStorage.setItem("ksbl_api_key", apiKey);
      localStorage.setItem("user_role", role);
      localStorage.setItem("user_email", email);
      router.push("/dashboard");
    } else {
      setError("Please enter a valid API Key");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <img src="/KSBL-Logo.png" alt="KSBL Logo" className="h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-ksbl-navy">KSBL Knowledge Admin</h1>
          <p className="text-slate-500 mt-1 text-sm">Secure access to Knowledge Base</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Select Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  setEmail(newRole === "super_admin" ? "superadmin@ksbl.edu.pk" : "admin@ksbl.edu.pk");
                }}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-ksbl-navy focus:border-ksbl-navy sm:text-sm transition-all"
              >
                <option value="admin">Normal Admin (Files only)</option>
                <option value="super_admin">Super Admin (Prompts & Files)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ksbl-navy focus:border-ksbl-navy sm:text-sm transition-all"
                placeholder="admin@ksbl.edu.pk"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ksbl-navy focus:border-ksbl-navy sm:text-sm transition-all"
                placeholder="Enter your security token"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-ksbl-navy hover:bg-ksbl-navy/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ksbl-navy transition-all active:scale-[0.98]"
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
