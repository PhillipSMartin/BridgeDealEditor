import React from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import { Hand, Suit, Direction } from '@/types/bridge';

interface HandDisplayProps {
  hand: Hand;
  direction: Direction;
  playerName: string;
  selectedCards: Set<string>;
  playCards: Map<string, number>;
  onCardClick: (suit: Suit, rank: string) => void;
  onCardDragStart: (e: React.DragEvent, suit: Suit, rank: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
}

const SUIT_ORDER: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

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
  className
}) => {
  const parseCards = (cardString: string): string[] => {
    return cardString.split('').filter(card => card !== '');
  };

  const getCardKey = (suit: Suit, rank: string) => `${suit[0]}${rank}`;

  return (
    <div
      className={cn(
        "p-4 border border-border rounded-lg bg-card min-h-32",
        className
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="text-center mb-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {direction}
        </h3>
        <p className="text-sm font-medium">{playerName}</p>
      </div>
      
      <div className="space-y-2">
        {SUIT_ORDER.map(suit => {
          const cards = parseCards(hand[suit]);
          return (
            <div key={suit} className="flex items-center gap-1 min-h-6">
              <span className={cn("text-sm font-medium w-3", SUIT_COLORS[suit])}>
                {SUIT_SYMBOLS[suit]}
              </span>
              <div className="flex gap-1 flex-wrap">
                {cards.map(rank => {
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
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};