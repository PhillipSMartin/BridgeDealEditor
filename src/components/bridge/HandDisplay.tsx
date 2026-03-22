import React, { useState } from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import { Hand, Suit, Direction } from '@/types/bridge';

interface HandDisplayProps {
  hand: Hand | undefined;
  direction: Direction;
  playerName: string | undefined;
  selectedCards: Set<string>;
  playCards: Map<string, number>;
  onCardClick: (suit: Suit, rank: string) => void;
  onCardDragStart: (e: React.DragEvent, suit: Suit, rank: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onNameChange?: (newName: string) => void;
  className?: string;
}

const SUIT_ORDER: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

const SUIT_SYMBOLS = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  Spades: 'hsl(220 25% 88%)',
  Hearts: 'hsl(0 80% 60%)',
  Diamonds: 'hsl(0 80% 60%)',
  Clubs: 'hsl(220 25% 88%)',
};

const DIRECTION_LABELS: Record<Direction, string> = {
  North: 'N',
  South: 'S',
  East: 'E',
  West: 'W',
};

export const HandDisplay: React.FC<HandDisplayProps> = ({
  hand,
  direction,
  playerName,
  selectedCards,
  playCards,
  onCardClick,
  onCardDragStart,
  onDragOver,
  onDrop,
  onNameChange,
  className,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const parseCards = (cardString: string | undefined): string[] =>
    (cardString ?? '').split('').filter(c => c !== '');

  const getCardKey = (suit: Suit, rank: string) => `${suit[0]}${rank}`;

  const startEdit = () => {
    if (!onNameChange) return;
    setDraft(playerName ?? '');
    setEditing(true);
  };

  const commitEdit = () => {
    onNameChange?.(draft.trim());
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div
      className={cn('relative p-4 rounded-xl min-w-52 transition-all duration-200', className)}
      style={{
        background: 'hsl(220 22% 13%)',
        border: '1px solid hsl(220 18% 22%)',
        boxShadow: '0 4px 24px hsl(220 25% 4%)',
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Direction badge */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: 'hsl(43 70% 42%)',
            color: 'hsl(220 25% 8%)',
          }}
        >
          {DIRECTION_LABELS[direction]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(215 15% 52%)' }}>
            {direction}
          </div>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              placeholder="Player name…"
              className="w-full text-sm font-medium bg-transparent outline-none border-b"
              style={{
                color: 'hsl(210 20% 82%)',
                borderColor: 'hsl(43 60% 45%)',
                caretColor: 'hsl(43 80% 55%)',
              }}
            />
          ) : (
            <div
              className="text-sm font-medium truncate"
              style={{
                color: playerName ? 'hsl(210 20% 82%)' : 'hsl(215 15% 38%)',
                cursor: onNameChange ? 'text' : 'default',
              }}
              title={onNameChange ? 'Click to edit name' : undefined}
              onClick={startEdit}
            >
              {playerName || (onNameChange ? '—' : '—')}
            </div>
          )}
        </div>
      </div>

      <div
        className="w-full border-t mb-3"
        style={{ borderColor: 'hsl(220 18% 22%)' }}
      />

      {/* Cards by suit */}
      <div className="space-y-2">
        {SUIT_ORDER.map(suit => {
          const cards = parseCards(hand?.[suit]);
          return (
            <div key={suit} className="flex items-center gap-1.5 min-h-6">
              <span
                className="text-base font-bold w-4 shrink-0 leading-none"
                style={{ color: SUIT_COLORS[suit] }}
              >
                {SUIT_SYMBOLS[suit]}
              </span>
              <div className="flex gap-1 flex-wrap">
                {cards.length > 0 ? cards.map(rank => {
                  const cardKey = getCardKey(suit, rank);
                  const isSelected = selectedCards.has(cardKey);
                  const playOrder = playCards.get(cardKey);
                  return (
                    <Card
                      key={`${suit}-${rank}`}
                      rank={rank}
                      suit={suit}
                      isSelected={isSelected}
                      isPlayCard={playOrder !== undefined}
                      playOrder={playOrder}
                      onClick={() => onCardClick(suit, rank)}
                      onDragStart={(e) => onCardDragStart(e, suit, rank)}
                    />
                  );
                }) : (
                  <span className="text-xs" style={{ color: 'hsl(215 15% 38%)' }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
