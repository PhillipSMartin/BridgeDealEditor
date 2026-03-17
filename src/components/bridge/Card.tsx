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

const SUIT_SYMBOLS = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣'
};

const SUIT_COLORS = {
  Spades: 'text-bridge-spade',
  Hearts: 'text-bridge-heart',
  Diamonds: 'text-bridge-diamond',
  Clubs: 'text-bridge-club'
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
  className
}) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center min-w-8 h-6 px-1 rounded border bg-card text-card-foreground cursor-pointer select-none transition-all duration-200",
        "hover:bg-card-hover",
        isSelected && "bg-card-selected border-card-selected",
        isDragging && "bg-card-dragging opacity-50 scale-105",
        isPlayCard && "ring-2 ring-primary",
        className
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <span className="text-xs font-medium">
        {rank}
      </span>
      <span className={cn("text-xs ml-0.5", SUIT_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
      {playOrder !== undefined && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
          {playOrder}
        </div>
      )}
    </div>
  );
};