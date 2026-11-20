import React from 'react';
import Link from 'next/link';
import { 
  Bot, 
  LayoutDashboard, 
  Database, 
  Settings, 
  Code, 
  LogOut,
  Bell
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F7EF] flex font-sans text-[#202820]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5F0E1] flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="h-20 flex items-center px-6 border-b border-[#E5F0E1]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-[#254B35]" />
            <span className="text-xl font-semibold tracking-tight text-[#254B35]">SupportAI</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#F1F7EF] text-[#254B35] rounded-xl font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </Link>
          <Link href="/dashboard/knowledge" className="flex items-center gap-3 px-4 py-3 text-[#647267] hover:bg-[#F1F7EF] hover:text-[#254B35] rounded-xl font-medium transition-colors">
            <Database className="w-5 h-5" />
            Knowledge Base
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-[#647267] hover:bg-[#F1F7EF] hover:text-[#254B35] rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Chatbot Settings
          </Link>
          <Link href="/dashboard/embed" className="flex items-center gap-3 px-4 py-3 text-[#647267] hover:bg-[#F1F7EF] hover:text-[#254B35] rounded-xl font-medium transition-colors">
            <Code className="w-5 h-5" />
            Embed Code
          </Link>
        </nav>

        <div className="p-4 border-t border-[#E5F0E1]">
          <button className="flex items-center gap-3 px-4 py-3 w-full text-[#647267] hover:bg-[#ffeaea] hover:text-red-600 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[#E5F0E1] flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-[#202820]">Dashboard</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#647267] hover:bg-[#F1F7EF] rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#A8C99B] rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#254B35] text-white flex items-center justify-center font-semibold">
              CR
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}