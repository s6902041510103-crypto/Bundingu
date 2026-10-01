'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface DiceProps {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  isRolling?: boolean;
  animationSeed?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onAnimationComplete?: () => void;
}

const DICE_FACES = {
  1: [
    { x: 50, y: 50 },
  ],
  2: [
    { x: 25, y: 25 },
    { x: 75, y: 75 },
  ],
  3: [
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
  ],
  4: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
  5: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 50, y: 50 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
  6: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 25, y: 50 },
    { x: 75, y: 50 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
} as const;

const SIZE_CLASSES = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24',
};

const DOT_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export function Dice({
  value,
  isRolling = false,
  animationSeed,
  className = '',
  size = 'lg',
  onAnimationComplete,
}: DiceProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [showRolling, setShowRolling] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setShowRolling(true);
      // Simulate dice rolling through random values
      let rolls = 0;
      const maxRolls = 15;
      const interval = setInterval(() => {
        setCurrentValue(Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6);
        rolls++;
        if (rolls >= maxRolls) {
          clearInterval(interval);
          setCurrentValue(value);
          setShowRolling(false);
          onAnimationComplete?.();
        }
      }, 80);
      return () => clearInterval(interval);
    }
  }, [isRolling, value, onAnimationComplete]);

  const faces = DICE_FACES[currentValue];
  const sizeClass = SIZE_CLASSES[size];
  const dotSizeClass = DOT_SIZES[size];

  return (
    <div
      className={`relative ${sizeClass} rounded-xl bg-white border-2 border-gray-200 shadow-lg flex items-center justify-center transition-all duration-200 ${className}`}
      style={{
        transform: isRolling ? 'rotateX(10deg) rotateY(-5deg)' : 'none',
        boxShadow: isRolling
          ? '0 10px 25px rgba(0,0,0,0.15), 0 0 0 3px rgba(99,102,241,0.3)'
          : '0 4px 12px rgba(0,0,0,0.1)',
      }}
      role="img"
      aria-label={`ลูกเต๋าแสดง ${currentValue}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-[inherit] opacity-50" />
      <div className="relative grid grid-cols-3 grid-rows-3 gap-1 p-1.5 sm:p-2 md:p-2.5 lg:p-3">
        {faces.map((dot, index) => (
          <div
            key={index}
            className={`${dotSizeClass} bg-gray-800 rounded-full mx-auto my-auto transition-all duration-150 ${
              isRolling ? 'animate-bounce' : 'animate-in'
            }`}
            style={{
              animationDelay: `${index * 30}ms`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {isRolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl animate-bounce text-indigo-500">
            🎲
          </div>
        </div>
      )}
    </div>
  );
}

interface DiceTrayProps {
  value?: 1 | 2 | 3 | 4 | 5 | 6;
  isRolling?: boolean;
  animationSeed?: string;
  onRoll?: () => void;
  disabled?: boolean;
  className?: string;
}

export function DiceTray({ value = 1, isRolling = false, animationSeed, onRoll, disabled = false, className = '' }: DiceTrayProps) {
  const handleClick = useCallback(() => {
    if (!disabled && !isRolling && onRoll) {
      onRoll();
    }
  }, [disabled, isRolling, onRoll]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <Dice
          value={value}
          isRolling={isRolling}
          animationSeed={animationSeed}
          size="lg"
        />
        {isRolling && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full shadow-lg animate-pulse whitespace-nowrap">
            กำลังทอย...
          </div>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={disabled || isRolling}
        className="btn-primary px-6 py-2 text-sm whitespace-nowrap transition-opacity disabled:opacity-50"
        aria-label={isRolling ? 'กำลังทอยลูกเต๋า' : 'ทอยลูกเต๋า'}
      >
        {isRolling ? (
          <span className="flex items-center gap-1">
            <span className="animate-spin">⏳</span>
            กำลังทอย...
          </span>
        ) : (
          'ทอยลูกเต๋า'
        )}
      </button>
    </div>
  );
}