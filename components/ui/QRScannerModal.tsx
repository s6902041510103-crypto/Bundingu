"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, ImageUp, X, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (pinOrUrl: string) => void;
}

/**
 * Extracts a 6-character room PIN from either a raw PIN string or a full URL like
 * `https://.../join?pin=KS4829` or `.../game/KS4829`
 */
export function extractRoomPinFromScannedText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Check URL query param `?pin=XXXXXX`
  try {
    const url = new URL(trimmed);
    const pinParam = url.searchParams.get("pin");
    if (pinParam) {
      const cleaned = pinParam.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(cleaned)) {
        return cleaned;
      }
    }
    // Check path segments e.g. /game/KS4829
    const parts = url.pathname.split("/").filter(Boolean);
    for (const part of parts) {
      const cleaned = part.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(cleaned)) {
        return cleaned;
      }
    }
  } catch {
    // Not a full URL, check regex below
  }

  // 2. Match `pin=XXXXXX` anywhere in text
  const pinMatch = trimmed.match(/[?&]pin=([a-zA-Z0-9]{6})/i);
  if (pinMatch?.[1]) {
    return pinMatch[1].toUpperCase();
  }

  // 3. Direct 6-char alphanumeric PIN
  const directClean = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(directClean)) {
    return directClean;
  }

  return null;
}

export function QRScannerModal({
  open,
  onClose,
  onScanSuccess,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string>("");
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecodedText = useCallback(
    (rawText: string) => {
      const extractedPin = extractRoomPinFromScannedText(rawText);
      if (extractedPin) {
        stopCamera();
        onScanSuccess(extractedPin);
      } else {
        setCameraError(
          `สแกนพบข้อมูล "${rawText.slice(0, 40)}" แต่ไม่พบรหัสห้อง 6 หลัก กรุณาสแกน QR ของห้องเกม`,
        );
      }
    },
    [onScanSuccess, stopCamera],
  );

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code?.data) {
          const pin = extractRoomPinFromScannedText(code.data);
          if (pin) {
            stopCamera();
            onScanSuccess(pin);
            return;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onScanSuccess, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setIsStartingCamera(true);
    stopCamera();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง คุณสามารถกดปุ่ม 'เลือกรูป QR / ถ่ายรูป' ด้านล่างแทนได้",
      );
      setIsStartingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStartingCamera(false);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCameraError(
        "ไม่สามารถเปิดกล้องได้ (อาจยังไม่ได้อนุญาตสิทธิ์กล้อง หรือเปิดผ่านแอปที่บล็อกกล้อง) คุณสามารถกดปุ่ม 'เลือกรูป QR / ถ่ายรูป' ด้านล่างได้เลย",
      );
      setIsStartingCamera(false);
    }
  }, [facingMode, scanFrame, stopCamera]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code?.data) {
          handleDecodedText(code.data);
        } else {
          setCameraError(
            "ไม่พบ QR Code ในรูปภาพนี้ กรุณาถ่ายให้เห็นกรอบ QR Code ชัดเจนขึ้น",
          );
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="สแกน QR Code เข้าห้องเกม"
    >
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0f2547] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/25 border border-blue-400/40 flex items-center justify-center">
              <Camera className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base sm:text-lg leading-tight">
                สแกน QR Code เข้าห้องเกม
              </h2>
              <p className="text-xs text-blue-200">
                ส่องกล้องไปที่ QR Code บนหน้าจอครูผู้สอน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่างสแกน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-blue-500/30 shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Reticle Overlay */}
            <div className="inset-6 absolute pointer-events-none border-2 border-amber-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]">
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-amber-300 rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-amber-300 rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-amber-300 rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-amber-300 rounded-br-xl" />
            </div>

            {isStartingCamera && (
              <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center gap-2 text-white text-sm font-display">
                <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
                <span>กำลังเปิดกล้องสแกน QR...</span>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{cameraError}</span>
            </div>
          )}

          {/* Camera Controls & Image Fallback */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              onClick={() =>
                setFacingMode((prev) =>
                  prev === "environment" ? "user" : "environment",
                )
              }
              iconLeft={<RefreshCw className="w-4 h-4" />}
              className="rounded-xl"
            >
              สลับกล้องหน้า/หลัง
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
              iconLeft={<ImageUp className="w-4 h-4 text-blue-600" />}
              className="rounded-xl"
            >
              เลือกรูป QR / ถ่ายรูป
            </Button>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>ทิป:</strong> สามารถใช้ตัวสแกน QR ในแอป <strong>LINE</strong> หรือกล้องมือถือส่องที่จอครูเพื่อเข้าห้องอัตโนมัติได้ทันที!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
