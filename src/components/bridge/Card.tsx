import React from 'react';
import { cn } from '@/lib/utils';
import { Suit } from '@/types/bridge';

interface CardProps {
  rank: string;
  suit: Suit;
  isSelected?: boolean;
  isDragging?: boolean;
  isPlayCard?: boolean;
  playOrder?: number;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
};

const SUIT_TEXT_COLORS: Record<Suit, string> = {
  Spades: '#1a1a2e',
  Hearts: '#c0392b',
  Diamonds: '#c0392b',
  Clubs: '#1a1a2e',
};

export const Card: React.FC<CardProps> = ({
  rank,
  suit,
  isSelected = false,
  isDragging = false,
  isPlayCard = false,
  playOrder,
  onClick,
  onDragStart,
  onDragEnd,
  className,
}) => {
  const suitColor = SUIT_TEXT_COLORS[suit];

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer select-none transition-all duration-150',
        isDragging && 'opacity-40 scale-95',
        className
      )}
      style={{
        background: isSelected
          ? 'hsl(43 80% 88%)'
          : isPlayCard
          ? 'hsl(150 50% 90%)'
          : '#f8f6f0',
        border: isSelected
          ? '1.5px solid hsl(43 80% 50%)'
          : isPlayCard
          ? '1.5px solid hsl(150 55% 45%)'
          : '1px solid hsl(220 10% 78%)',
        boxShadow: isSelected
          ? '0 0 6px hsl(43 80% 55%)'
          : isPlayCard
          ? '0 0 5px hsl(150 55% 40%)'
          : '0 1px 3px hsl(220 20% 70%)',
        minWidth: '2rem',
        height: '1.5rem',
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <span
        className="text-xs font-bold leading-none"
        style={{ color: suitColor, fontFamily: 'Georgia, serif' }}
      >
        {rank}
      </span>
      <span
        className="text-xs leading-none"
        style={{ color: suitColor }}
      >
        {SUIT_SYMBOLS[suit]}
      </span>

      {/* Play order badge */}
      {playOrder !== undefined && (
        <div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: 'hsl(150 55% 38%)',
            color: '#fff',
            fontSize: '9px',
            lineHeight: 1,
            boxShadow: '0 1px 3px hsl(150 50% 20%)',
          }}
        >
          {playOrder}
        </div>
      )}

      {/* Selected glow indicator */}
      {isSelected && !isPlayCard && (
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ background: 'hsl(43 90% 52%)', boxShadow: '0 0 4px hsl(43 90% 52%)' }}
        />
      )}
    </div>
  );
};
