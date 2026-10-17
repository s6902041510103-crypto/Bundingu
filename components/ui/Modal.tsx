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
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      contentRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
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
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  return (
    <Fragment>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-h-[90vh]",
          "bg-slate-900 border border-slate-700 rounded-2xl shadow-elevated animate-scale-in",
          "overflow-hidden flex flex-col",
          sizes[size],
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between p-5 border-b border-slate-700">
            <div>
              {title && (
                <h2 id="modal-title" className="font-display text-xl font-bold text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-slate-400 text-sm mt-1">
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
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </Fragment>
  );
}

interface ToastProps {
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
  duration = 5000,
}: ToastProps) {
  const icons = {
    default: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colors = {
    default: "border-slate-600 bg-slate-800 text-slate-100",
    success: "border-emerald-500/30 bg-emerald-900/30 text-emerald-300",
    warning: "border-amber-500/30 bg-amber-900/30 text-amber-300",
    danger: "border-red-500/30 bg-red-900/30 text-red-300",
    info: "border-sky-500/30 bg-sky-900/30 text-sky-300",
  };

  const iconColors = {
    default: "text-slate-400",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
    info: "text-sky-400",
  };

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border shadow-elevated animate-slide-up",
        colors[variant],
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn("flex-shrink-0 mt-0.5", iconColors[variant])}>{icons[variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-sm opacity-80 mt-0.5">{description}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onClose(id)}
        aria-label="ปิดการแจ้งเตือน"
        className="opacity-50 hover:opacity-100 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)]"
      aria-live="polite"
      aria-label="การแจ้งเตือน"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}