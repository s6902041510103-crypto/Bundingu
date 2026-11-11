"use client";

import React, { useMemo } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

/**
 * Renders an authentic ISO/IEC 18004 standard QR Code SVG that can be scanned
 * by LINE, iOS/Android native cameras, and our in-app QR scanner.
 * Includes a 2-module quiet zone around the matrix so mobile scanners read it instantly.
 */
export function QRCodeSVG({ value, size = 128, label, className }: QRCodeSVGProps) {
  const qrData = useMemo(() => {
    if (!value) return null;
    try {
      const qr = QRCode.create(value, {
        errorCorrectionLevel: "M",
      });
      const moduleCount = qr.modules.size;
      const matrix: boolean[][] = [];
      for (let r = 0; r < moduleCount; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < moduleCount; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }
        matrix.push(row);
      }
      return { matrix, moduleCount };
    } catch {
      return null;
    }
  }, [value]);

  if (!qrData || !value) return null;

  const { matrix, moduleCount } = qrData;
  const quietZone = 2;
  const totalViewBox = moduleCount + quietZone * 2;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs",
        className,
      )}
      title={`QR Code: ${value}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Code สำหรับเข้าร่วมห้อง ${value}`}
      >
        <rect width={totalViewBox} height={totalViewBox} fill="#ffffff" />
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx + quietZone}
                y={rIdx + quietZone}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null,
          ),
        )}
      </svg>
      {label && (
        <span className="mt-1.5 font-mono text-[11px] font-bold text-[#0f2547] tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
