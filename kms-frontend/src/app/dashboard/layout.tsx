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
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@ksbl.edu.pk");

  useEffect(() => {
    const key = localStorage.getItem("ksbl_api_key");
    const storedRole = localStorage.getItem("user_role") || "admin";
    const storedEmail = localStorage.getItem("user_email") || "admin@ksbl.edu.pk";
    
    if (!key) {
      router.push("/login");
    } else {
      setRole(storedRole);
      setEmail(storedEmail);
      setIsReady(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("ksbl_api_key");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    router.push("/login");
  };

  if (!isReady) return null;

  // Role based filtering of nav items
  const navItems = [
    { name: "Files", icon: FileText, href: "/dashboard" },
  ];

  if (role === "super_admin") {
    navItems.push({ name: "Prompts", icon: LayoutDashboard, href: "/dashboard/prompts" });
  }

  // Double check manual navigation bypass for normal admin
  if (role === "admin" && pathname === "/dashboard/prompts") {
    router.push("/dashboard");
    return null;
  }

  const isSuper = role === "super_admin";
  const fullName = isSuper ? "Super Admin" : "Admin User";
  const initials = isSuper ? "SA" : "AU";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-ksbl-navy text-slate-300 border-r border-ksbl-navy flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <img src="/KSBL-Logo.png" alt="KSBL Logo" className="h-10 object-contain bg-white p-1 rounded" />
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-tight text-sm">KSBL Admin</span>
            <span className="text-[10px] text-ksbl-gold font-bold uppercase tracking-wider">Dashboard</span>
          </div>
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
                    ? "bg-white/10 text-white font-bold border-l-4 border-ksbl-gold"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-ksbl-gold" : "text-slate-400"}`} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-ksbl-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-ksbl-gold text-ksbl-navy flex items-center justify-center font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{fullName}</p>
              <p className="text-xs text-slate-400 truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
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
