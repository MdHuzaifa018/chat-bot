"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Sliders, Code2, User, LogOut, Menu, X } from "lucide-react";
import { fetchCurrentAccount, signOut } from "@/api/saasApi";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import ProfileModal from "@/components/ProfileModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientName, setClientName] = useState("Client");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentAccount()
      .then(({ account }) => {
        if (!isMounted) return;
        if (account.accountType !== "client") {
          router.replace("/");
          return;
        }
        const displayName = account.name || (account as any).businessName || account.username || "Client";
        setClientName(displayName);
      })
      .catch(() => {
        if (isMounted) router.replace("/");
      })
      .finally(() => {
        if (isMounted) setCheckingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const navItems = [
    { href: "/dashboard", label: "Chatbot Settings", icon: Sliders },
    { href: "/dashboard/setup-code", label: "Setup Code", icon: Code2 },
    { href: "/dashboard/profile", label: "Profile Settings", icon: User },
  ];

  const confirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut().catch(() => undefined);
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F1F7EF] text-sm text-[#647267]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#254B35] border-t-transparent rounded-full animate-spin" />
          <span>Loading client workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F7EF] flex text-[#202820]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E5F0E1] flex-col sticky top-0 h-screen shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-[#E5F0E1]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#254B35] flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#254B35]">
              SupportAI
            </span>
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
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-[#254B35]" />
                <span className="font-semibold text-[#254B35]">SupportAI</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-[#647267]"
              >
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
                      isActive
                        ? "bg-[#E5F0E1] text-[#254B35]"
                        : "text-[#647267]"
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
          <div
            className="flex-1 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
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
              {pathname === "/dashboard/setup-code"
                ? "Setup & Embed Code"
                : pathname === "/dashboard/profile"
                ? "Profile Settings"
                : "Chatbot Settings"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 p-1.5 pl-3 pr-2 rounded-full hover:bg-[#F1F7EF] border border-transparent hover:border-[#E5F0E1] transition-all cursor-pointer group"
              title="Open Profile Settings"
            >
              <span className="hidden sm:block text-sm font-medium text-[#647267] group-hover:text-[#254B35] transition-colors">
                {clientName}
              </span>
              <div className="w-9 h-9 rounded-full bg-[#254B35] text-white flex items-center justify-center text-xs font-semibold uppercase group-hover:ring-2 group-hover:ring-[#A8C99B] transition-all">
                {clientName.slice(0, 2)}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          accountType="client"
          onProfileUpdated={(updated) => {
            if (updated.name || updated.businessName) {
              setClientName(updated.name || updated.businessName || "Client");
            }
          }}
        />

        {/* Custom Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmSignOut}
          isLoading={isLoggingOut}
          title="Sign out of Client Dashboard?"
          description="Are you sure you want to log out? You will need your access code to log back in."
        />
      </div>
    </div>
  );
}