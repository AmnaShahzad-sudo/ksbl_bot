"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState("normal");

  useEffect(() => {
    const key = localStorage.getItem("ksbl_api_key");
    const storedRole = localStorage.getItem("ksbl_role") || "normal";
    setRole(storedRole);
    
    if (!key) {
      router.push("/login");
    } else {
      setIsReady(true);
      // Restrict access to prompts page for normal admins
      if (storedRole === "normal" && pathname.includes("/prompts")) {
        router.push("/dashboard");
      }
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("ksbl_api_key");
    localStorage.removeItem("ksbl_role");
    router.push("/login");
  };

  if (!isReady) return null;

  const navItems = [
    { name: "Files", icon: FileText, href: "/dashboard" },
    ...(role === "super" ? [{ name: "Prompts", icon: LayoutDashboard, href: "/dashboard/prompts" }] : []),
  ];

  const roleName = role === "super" ? "Super Admin" : "Normal Admin";
  const roleEmail = role === "super" ? "super.admin@ksbl.edu.pk" : "admin@ksbl.edu.pk";
  const initials = role === "super" ? "SA" : "NA";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002554] text-white flex flex-col shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-center bg-white/5">
          <img src="/KSBL_Logo.png" alt="KSBL Logo" className="h-12 w-auto object-contain" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-[#fdb913] border-l-4 border-[#fdb913] shadow-inner"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-[#fdb913]" : "text-slate-400"}`} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#fdb913]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl mb-4 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-[#fdb913]/20 flex items-center justify-center text-[#fdb913] font-bold shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{roleName}</p>
              <p className="text-xs text-slate-400 truncate">{roleEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
