"use client";

import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Sign out of SupportAI?",
  description = "Are you sure you want to log out? You will need to sign back in to access your dashboard.",
}: LogoutConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-[390px] bg-white rounded-3xl border border-[#E5F0E1] shadow-2xl p-6 sm:p-8 z-10 text-center animate-fadeIn transform transition-all">
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Badge Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-inner">
          <LogOut className="w-7 h-7" />
        </div>

        {/* Dialog Heading */}
        <h3 className="text-xl font-bold text-[#202820] tracking-tight">
          {title}
        </h3>

        {/* Dialog Description */}
        <p className="text-xs text-[#647267] leading-relaxed mt-2.5 max-w-[280px] mx-auto">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#647267] bg-[#F1F7EF] hover:bg-[#E5F0E1] hover:text-[#254B35] transition-colors cursor-pointer border border-[#E5F0E1] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
