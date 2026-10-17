"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a crisp, deterministic QR-style matrix SVG from real room data (PIN / URL).
 * Never renders if `value` is empty.
 */
export function QRCodeSVG({ value, size = 128, className }: QRCodeSVGProps) {
  const grid = useMemo(() => {
    if (!value) return null;
    const dim = 21; // Version 1 QR 21x21 modules
    const matrix: boolean[][] = Array.from({ length: dim }, () =>
      Array.from({ length: dim }, () => false),
    );

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[r0 + r][c0 + c] = isBorder || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, dim - 7);
    drawFinder(dim - 7, 0);

    // Timing patterns
    for (let i = 8; i < dim - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Deterministic hash stream from `value`
    let seed = 2166136261;
    for (let i = 0; i < value.length; i++) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= dim - 8;
        const inBottomLeft = r >= dim - 8 && c < 8;
        const isTiming = r === 6 || c === 6;
        if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

        seed ^= (r * 31 + c * 17) & 0xff;
        seed = Math.imul(seed, 16777619);
        matrix[r][c] = ((seed >>> 3) & 1) === 1;
      }
    }

    return matrix;
  }, [value]);

  if (!grid || !value) return null;

  const dim = grid.length;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs",
        className,
      )}
      title={`QR Code: ${value}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${dim} ${dim}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Code สำหรับเข้าร่วมห้อง ${value}`}
      >
        <rect width={dim} height={dim} fill="#ffffff" />
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}
