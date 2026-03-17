import React from 'react';
import { HandDisplay } from './HandDisplay';
import { cn } from '@/lib/utils';
import { BridgeBoard, Direction, Suit } from '@/types/bridge';

interface BridgeTableProps {
  board: BridgeBoard;
  selectedCards: Set<string>;
  playCards: Map<string, number>;
  onCardClick: (direction: Direction, suit: Suit, rank: string) => void;
  onCardDragStart: (e: React.DragEvent, direction: Direction, suit: Suit, rank: string) => void;
  onCardDrop: (e: React.DragEvent, targetDirection: Direction) => void;
}

export const BridgeTable: React.FC<BridgeTableProps> = ({
  board,
  selectedCards,
  playCards,
  onCardClick,
  onCardDragStart,
  onCardDrop
}) => {
  const getSeatByDirection = (direction: Direction) => {
    return board.Seats.find(seat => seat.Direction === direction);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, direction: Direction) => {
    e.preventDefault();
    onCardDrop(e, direction);
  };

  const northSeat = getSeatByDirection('North');
  const southSeat = getSeatByDirection('South');
  const eastSeat = getSeatByDirection('East');
  const westSeat = getSeatByDirection('West');

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* North position */}
      <div className="flex justify-center mb-4">
        {northSeat && (
          <HandDisplay
            hand={northSeat.Hand}
            direction="North"
            playerName={northSeat.Player}
            selectedCards={selectedCards}
            playCards={playCards}
            onCardClick={(suit, rank) => onCardClick('North', suit, rank)}
            onCardDragStart={(e, suit, rank) => onCardDragStart(e, 'North', suit, rank)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'North')}
            className="w-64"
          />
        )}
      </div>

      {/* West - Center - East */}
      <div className="flex items-center justify-between mb-4">
        {/* West position */}
        {westSeat && (
          <HandDisplay
            hand={westSeat.Hand}
            direction="West"
            playerName={westSeat.Player}
            selectedCards={selectedCards}
            playCards={playCards}
            onCardClick={(suit, rank) => onCardClick('West', suit, rank)}
            onCardDragStart={(e, suit, rank) => onCardDragStart(e, 'West', suit, rank)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'West')}
            className="w-64"
          />
        )}

        {/* Center table */}
        <div className="mx-8 w-32 h-32 bg-bridge-table rounded-lg flex items-center justify-center">
          <div className="text-center text-primary-foreground">
            <div className="text-sm font-medium">Board {board['Board number']}</div>
            <div className="text-xs">Dealer: {board.Dealer}</div>
          </div>
        </div>

        {/* East position */}
        {eastSeat && (
          <HandDisplay
            hand={eastSeat.Hand}
            direction="East"
            playerName={eastSeat.Player}
            selectedCards={selectedCards}
            playCards={playCards}
            onCardClick={(suit, rank) => onCardClick('East', suit, rank)}
            onCardDragStart={(e, suit, rank) => onCardDragStart(e, 'East', suit, rank)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'East')}
            className="w-64"
          />
        )}
      </div>

      {/* South position */}
      <div className="flex justify-center">
        {southSeat && (
          <HandDisplay
            hand={southSeat.Hand}
            direction="South"
            playerName={southSeat.Player}
            selectedCards={selectedCards}
            playCards={playCards}
            onCardClick={(suit, rank) => onCardClick('South', suit, rank)}
            onCardDragStart={(e, suit, rank) => onCardDragStart(e, 'South', suit, rank)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'South')}
            className="w-64"
          />
        )}
      </div>
    </div>
  );
};