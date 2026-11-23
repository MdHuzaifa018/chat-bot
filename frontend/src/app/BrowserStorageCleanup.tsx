"use client";

import { useEffect } from "react";

export function BrowserStorageCleanup() {
  useEffect(() => {
    try {
      // 1. Purge legacy Clerk & obsolete cookies from document.cookie
      if (typeof document !== "undefined" && document.cookie) {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const trimmed = cookie.trim();
          const eqIdx = trimmed.indexOf("=");
          const name = eqIdx > -1 ? trimmed.slice(0, eqIdx).trim() : trimmed;
          if (
            name.startsWith("__clerk") ||
            name.startsWith("__client_uat") ||
            name.startsWith("__session") ||
            name.startsWith("__refresh") ||
            name.includes("clerk")
          ) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        }
      }

      // 2. Purge legacy Clerk keys and legacy localStorage auth tokens
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("supportai_token");
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.toLowerCase().includes("clerk") || key.startsWith("__clerk") || key === "supportai_token")) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      }

      // 3. Purge legacy Clerk keys from sessionStorage
      if (typeof window !== "undefined" && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.toLowerCase().includes("clerk") || key.startsWith("__clerk"))) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {
      // Ignore security errors in strict iframe environments
    }
  }, []);

  return null;
}
