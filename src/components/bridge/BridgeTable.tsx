import React from 'react';
import { HandDisplay } from './HandDisplay';
import { BridgeBoard, Direction, Suit } from '@/types/bridge';

interface BridgeTableProps {
  board: BridgeBoard;
  selectedCards: Set<string>;
  playCards: Map<string, number>;
  onCardClick: (direction: Direction, suit: Suit, rank: string) => void;
  onCardDragStart: (e: React.DragEvent, direction: Direction, suit: Suit, rank: string) => void;
  onCardDrop: (e: React.DragEvent, targetDirection: Direction) => void;
  onNameChange?: (direction: Direction, newName: string) => void;
}

export const BridgeTable: React.FC<BridgeTableProps> = ({
  board,
  selectedCards,
  playCards,
  onCardClick,
  onCardDragStart,
  onCardDrop,
  onNameChange,
}) => {
  const getSeatByDirection = (direction: Direction) =>
    board.Seats.find(seat => seat.Direction === direction);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, direction: Direction) => {
    e.preventDefault();
    onCardDrop(e, direction);
  };

  const northSeat = getSeatByDirection('North');
  const southSeat = getSeatByDirection('South');
  const eastSeat = getSeatByDirection('East');
  const westSeat = getSeatByDirection('West');

  const vulnerabilityLabel = board.Vulnerability ?? '—';
  const contractLabel = board.Contract ?? '—';
  const declarerLabel = board.Declarer ?? '—';

  return (
    <div className="w-full max-w-5xl mx-auto select-none">
      {/* North */}
      <div className="flex justify-center mb-3">
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
            onNameChange={onNameChange ? (name) => onNameChange('North', name) : undefined}
          />
        )}
      </div>

      {/* West · Center · East */}
      <div className="flex items-center justify-center gap-3 mb-3">
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
            onNameChange={onNameChange ? (name) => onNameChange('West', name) : undefined}
          />
        )}

        {/* Center felt */}
        <div
          className="flex-shrink-0 w-44 h-44 rounded-full felt-texture flex flex-col items-center justify-center gap-1 shadow-2xl"
          style={{
            border: '3px solid hsl(43 50% 35%)',
            boxShadow: '0 0 32px hsl(150 50% 8%), inset 0 0 24px hsl(150 50% 12%)',
          }}
        >
          {/* Compass */}
          <div className="relative w-full flex justify-center mb-1">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>N</span>
              <div className="flex items-center gap-8">
                <span className="text-xs font-bold tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>W</span>
                <span className="text-xs font-bold tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>E</span>
              </div>
              <span className="text-xs font-bold tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>S</span>
            </div>
          </div>
          <div className="w-24 border-t" style={{ borderColor: 'hsl(43 50% 30%)' }} />
          <div className="text-center mt-1 space-y-0.5">
            <div className="text-sm font-bold" style={{ color: 'hsl(210 20% 90%)' }}>
              Board {board['Board number']}
            </div>
            <div className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>
              Dealer: {board.Dealer}
            </div>
            {vulnerabilityLabel !== '—' && (
              <div className="text-xs" style={{ color: 'hsl(0 70% 60%)' }}>
                Vul: {vulnerabilityLabel}
              </div>
            )}
            {contractLabel !== '—' && (
              <div className="text-xs font-semibold" style={{ color: 'hsl(43 70% 60%)' }}>
                {contractLabel} by {declarerLabel}
              </div>
            )}
          </div>
        </div>

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
            onNameChange={onNameChange ? (name) => onNameChange('East', name) : undefined}
          />
        )}
      </div>

      {/* South */}
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
            onNameChange={onNameChange ? (name) => onNameChange('South', name) : undefined}
          />
        )}
      </div>
    </div>
  );
};
