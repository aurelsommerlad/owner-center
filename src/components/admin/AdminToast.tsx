"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastState {
  id: number;
  message: string;
}

const AdminToastContext = createContext<((message: string) => void) | null>(null);

/** Very dezent feedback for successful mock changes - a small pill, no browser alert(). */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = Date.now();
    setToast({ id, message });
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  return (
    <AdminToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-soft-lg">
            {toast.message}
          </div>
        </div>
      )}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): (message: string) => void {
  const context = useContext(AdminToastContext);
  if (!context) throw new Error("useAdminToast must be used within AdminToastProvider");
  return context;
}
