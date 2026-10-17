"use client";

import React, { Fragment, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  theme?: "light" | "dark";
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  theme = "light",
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-4xl",
  };

  const isDark = theme === "dark";

  return (
    <Fragment>
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 animate-fade-in no-print"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-1.5rem)] max-h-[90vh]",
          "rounded-3xl shadow-2xl animate-scale-in overflow-hidden flex flex-col",
          isDark
            ? "bg-[#0f2347] border border-blue-400/30 text-white"
            : "bg-white border border-slate-200 text-slate-900",
          sizes[size],
          className,
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
      >
        {(title || showClose) && (
          <div
            className={cn(
              "flex items-start justify-between px-6 py-4 border-b no-print",
              isDark ? "border-blue-400/20 bg-[#0b1930]/60" : "border-slate-100 bg-slate-50/70",
            )}
          >
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className={cn(
                    "font-display text-xl font-bold",
                    isDark ? "text-white" : "text-slate-900",
                  )}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className={cn(
                    "text-sm mt-0.5",
                    isDark ? "text-slate-300" : "text-slate-500",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="ปิดหน้าต่าง"
                className={cn(
                  isDark
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60",
                )}
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </Fragment>
  );
}

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  onClose: (id: string) => void;
  duration?: number;
}

export function Toast({
  id,
  title,
  description,
  variant = "default",
  onClose,
  duration = 4000,
}: ToastProps) {
  const colors = {
    default: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-2xl border shadow-xl animate-slide-up",
        colors[variant],
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm">{title}</p>
        {description && <p className="text-xs opacity-85 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="ปิดการแจ้งเตือน"
        className="opacity-60 hover:opacity-100 p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<Omit<ToastProps, "onClose">>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-80 max-w-[calc(100vw-2rem)] no-print"
      aria-live="polite"
      aria-label="การแจ้งเตือน"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}