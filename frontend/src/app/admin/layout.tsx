"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import ProfileModal from "@/components/ProfileModal";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { fetchCurrentAccount, signOut } from "@/api/saasApi";

interface AdminSession {
  name: string;
  email: string;
  permissions: {
    acceptRequests: boolean;
    rejectRequests: boolean;
    viewTelemetry: boolean;
    manageWebsites: boolean;
    manageTeam: boolean;
  };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Allow the login page to render without checking auth
    if (pathname === "/admin/login") {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;
    fetchCurrentAccount()
      .then(({ account }) => {
        if (!isMounted) return;
        if (account.accountType === "admin") {
          setSession({
            name: account.name || "Administrator",
            email: account.email || "",
            permissions: (account.permissions as any) || {
              acceptRequests: true,
              rejectRequests: true,
              viewTelemetry: true,
              manageWebsites: true,
              manageTeam: true,
            },
          });
          setCheckingAuth(false);
        } else {
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        const raw = typeof window !== "undefined" ? localStorage.getItem("supportai_admin_session") : null;
        if (raw) {
          try {
            setSession(JSON.parse(raw));
            setCheckingAuth(false);
            return;
          } catch {}
        }
        if (isMounted) router.replace("/admin/login");
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  // 1. Render login page full-screen without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // 2. Prevent dashboard flash while redirecting unauthenticated users
  if (checkingAuth || !session) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F1F7EF] flex items-center justify-center text-sm text-[#647267]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#254B35] border-t-transparent rounded-full animate-spin" />
          <span>Checking access...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: "/admin",
      label: "Overview & Telemetry",
      icon: LayoutDashboard,
      visible: session.permissions.viewTelemetry || session.permissions.manageTeam,
    },
    {
      href: "/admin/requests",
      label: "Client Requests",
      icon: Inbox,
      visible: session.permissions.acceptRequests || session.permissions.rejectRequests,
    },
    {
      href: "/admin/permissions",
      label: "Team Permissions",
      icon: ShieldCheck,
      visible: session.permissions.manageTeam,
    },
    {
      href: "/admin/profile",
      label: "Profile Settings",
      icon: User,
      visible: true,
    },
  ].filter((item) => item.visible);

  const confirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut().catch(() => undefined);
      localStorage.removeItem("supportai_admin_session");
      router.replace("/admin/login");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F7EF] flex text-[#202820] font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E5F0E1] flex-col sticky top-0 h-screen shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-[#E5F0E1]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#254B35] flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight text-[#254B35] block leading-none">
                SupportAI
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#647267]">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E5F0E1] text-[#254B35]"
                    : "text-[#647267] hover:bg-[#F1F7EF] hover:text-[#254B35]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5F0E1]">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-[#647267] hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-64 bg-white h-full border-r border-[#E5F0E1] flex flex-col p-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5F0E1]">
              <span className="font-semibold text-[#254B35]">SupportAI Admin</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 text-[#647267]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive ? "bg-[#E5F0E1] text-[#254B35]" : "text-[#647267]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={() => {
                setMobileOpen(false);
                setShowLogoutModal(true);
              }}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-[#E5F0E1] flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-[#254B35] hover:bg-[#F1F7EF]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[#202820]">
              {pathname === "/admin/profile"
                ? "Profile Settings"
                : pathname === "/admin/requests"
                ? "Client Requests"
                : pathname === "/admin/permissions"
                ? "Team & Permissions"
                : "Admin Overview"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#254B35] animate-pulse"></span>
              {session.permissions.manageTeam ? "Super Admin" : "Team Member"}
            </span>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#254B35] text-white flex items-center justify-center text-xs font-semibold uppercase hover:ring-2 hover:ring-[#A8C99B] transition-all cursor-pointer"
              title="Open Admin Profile Settings"
            >
              {session.name.slice(0, 2)}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          accountType="admin"
          onProfileUpdated={(updated) => {
            if (updated.name) {
              setSession((prev) =>
                prev ? { ...prev, name: updated.name, email: updated.email } : prev
              );
            }
          }}
        />

        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmSignOut}
          isLoading={isLoggingOut}
          title="Sign out of Admin Console?"
          description="Are you sure you want to log out of the SupportAI administrator console?"
        />
      </div>
    </div>
  );
}