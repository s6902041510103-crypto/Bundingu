"use client";

import React, { useState, useCallback } from "react";
import { Toast, ToastContainer } from "./Modal";

export { Toast, ToastContainer };

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
