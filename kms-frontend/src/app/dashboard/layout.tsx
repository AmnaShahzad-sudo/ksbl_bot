"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  User, 
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
  const [userRole, setUserRole] = useState("super_admin");

  useEffect(() => {
    const key = localStorage.getItem("ksbl_api_key");
    const role = localStorage.getItem("ksbl_user_role") || "super_admin";
    
    if (!key) {
      router.push("/login");
    } else {
      setUserRole(role);
      // Access Control: Normal admins cannot access prompts pages
      if (role === "normal_admin" && (pathname.startsWith("/dashboard/prompts") || pathname.includes("/edit/prompt"))) {
        router.push("/dashboard");
      } else {
        setIsReady(true);
      }
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("ksbl_api_key");
    localStorage.removeItem("ksbl_user_role");
    router.push("/login");
  };

  if (!isReady) return null;

  // Filter navigation items based on role
  const navItems = [
    { name: "Files", icon: FileText, href: "/dashboard" },
    ...(userRole === "super_admin" 
      ? [{ name: "Prompts", icon: LayoutDashboard, href: "/dashboard/prompts" }]
      : []
    ),
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-ksbl-navy text-white flex flex-col shadow-xl">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 bg-ksbl-gold rounded-lg flex items-center justify-center shadow-md">
            <span className="text-ksbl-navy font-extrabold text-lg">K</span>
          </div>
          <div>
            <span className="font-extrabold text-white tracking-tight text-base block">KSBL KMS</span>
            <span className="text-[10px] text-ksbl-gold/80 font-bold uppercase tracking-wider block">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white/10 text-ksbl-gold border-l-4 border-ksbl-gold pl-3"
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

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl mb-4 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-ksbl-gold flex items-center justify-center text-ksbl-navy font-bold shadow-inner">
              {userRole === "super_admin" ? "SA" : "NA"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {userRole === "super_admin" ? "Super Admin" : "Normal Admin"}
              </p>
              <span className="inline-block text-[9px] font-extrabold text-ksbl-gold bg-ksbl-gold/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {userRole === "super_admin" ? "All Access" : "Files Only"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all"
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
