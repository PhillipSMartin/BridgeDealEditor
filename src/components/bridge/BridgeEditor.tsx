import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BridgeTable } from './BridgeTable';
import { BridgeBoard, Direction, Suit } from '@/types/bridge';
import { LinParser } from '@/utils/linParser';
import { toast } from 'sonner';

export const BridgeEditor: React.FC = () => {
  const [board, setBoard] = useState<BridgeBoard | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bboUrl, setBboUrl] = useState('');
  const [playCards, setPlayCards] = useState<Map<string, number>>(new Map());
  const [playOrderCounter, setPlayOrderCounter] = useState(1);
  const [draggedCard, setDraggedCard] = useState<{
    suit: Suit;
    rank: string;
    fromDirection: Direction;
  } | null>(null);

  const initializeBoardData = useCallback((boardData: BridgeBoard) => {
    setBoard(boardData);
    const newPlayCards = new Map<string, number>();
    boardData.Play.forEach((card: string, index: number) => {
      newPlayCards.set(card, index + 1);
    });
    setPlayCards(newPlayCards);
    setPlayOrderCounter(boardData.Play.length + 1);
    setSelectedCards(new Set());
  }, []);

  const loadJsonFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        initializeBoardData(jsonData);
        toast('JSON file loaded successfully!');
      } catch (error) {
        toast('Error parsing JSON file. Please check the format.');
        console.error('JSON parse error:', error);
      }
    };
    reader.readAsText(file);
  }, [initializeBoardData]);

  const importBboUrl = useCallback(() => {
    if (!bboUrl.trim()) {
      toast('Please enter a BBO URL.');
      return;
    }
    try {
      const boardData = LinParser.parseLinFromUrl(bboUrl.trim());
      if (boardData) {
        initializeBoardData(boardData);
        toast('BBO URL imported successfully!');
      } else {
        toast('Could not parse the BBO URL. Please check the format.');
      }
    } catch (error) {
      toast('Error parsing BBO URL.');
      console.error('BBO URL parse error:', error);
    }
  }, [bboUrl, initializeBoardData]);

  const getCardKey = (suit: Suit, rank: string) => `${suit[0]}${rank}`;

  const handleCardClick = useCallback((direction: Direction, suit: Suit, rank: string) => {
    const cardKey = getCardKey(suit, rank);
    if (playCards.has(cardKey)) {
      const newPlayCards = new Map(playCards);
      const removedOrder = newPlayCards.get(cardKey)!;
      newPlayCards.delete(cardKey);
      for (const [key, order] of newPlayCards.entries()) {
        if (order > removedOrder) {
          newPlayCards.set(key, order - 1);
        }
      }
      setPlayCards(newPlayCards);
      setPlayOrderCounter(playOrderCounter - 1);
      toast(`Card ${cardKey} removed from play sequence`);
      return;
    }
    if (selectedCards.has(cardKey)) {
      const newPlayCards = new Map(playCards);
      newPlayCards.set(cardKey, playOrderCounter);
      setPlayCards(newPlayCards);
      setPlayOrderCounter(playOrderCounter + 1);
      const newSelectedCards = new Set(selectedCards);
      newSelectedCards.delete(cardKey);
      setSelectedCards(newSelectedCards);
      toast(`Card ${cardKey} added to play sequence (order ${playOrderCounter})`);
    } else {
      const newSelectedCards = new Set(selectedCards);
      newSelectedCards.add(cardKey);
      setSelectedCards(newSelectedCards);
      toast(`Card ${cardKey} selected — click again to add to play sequence`);
    }
  }, [selectedCards, playCards, playOrderCounter]);

  const handleCardDragStart = useCallback((
    e: React.DragEvent,
    direction: Direction,
    suit: Suit,
    rank: string
  ) => {
    setDraggedCard({ suit, rank, fromDirection: direction });
    e.dataTransfer.setData('text/plain', JSON.stringify({ suit, rank, fromDirection: direction }));
  }, []);

  const handleCardDrop = useCallback((e: React.DragEvent, targetDirection: Direction) => {
    if (!draggedCard || !board) return;
    const { suit, rank, fromDirection } = draggedCard;
    if (fromDirection === targetDirection) {
      setDraggedCard(null);
      return;
    }
    const newBoard = { ...board };
    newBoard.Seats = board.Seats.map(seat => {
      if (seat.Direction === fromDirection) {
        const currentCards = seat.Hand[suit].split('');
        const cardIndex = currentCards.indexOf(rank);
        if (cardIndex > -1) currentCards.splice(cardIndex, 1);
        return { ...seat, Hand: { ...seat.Hand, [suit]: currentCards.join('') } };
      } else if (seat.Direction === targetDirection) {
        const rankOrder = 'AKQJT98765432';
        const newCards = (seat.Hand[suit] + rank).split('');
        newCards.sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
        return { ...seat, Hand: { ...seat.Hand, [suit]: newCards.join('') } };
      }
      return seat;
    });
    setBoard(newBoard);
    setDraggedCard(null);
    toast(`Moved ${rank}${suit[0]} from ${fromDirection} to ${targetDirection}`);
  }, [draggedCard, board]);

  const exportJson = useCallback(() => {
    if (!board) return;
    const playSequence = Array.from(playCards.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([card]) => card);
    const exportData = { ...board, Play: playSequence };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `board${board['Board number']}_modified.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast('JSON file exported successfully!');
  }, [board, playCards]);

  const clearPlaySequence = useCallback(() => {
    setPlayCards(new Map());
    setPlayOrderCounter(1);
    setSelectedCards(new Set());
    toast('Play sequence cleared');
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: 'hsl(220 25% 8%)' }}>
      {/* Header */}
      <header
        className="w-full border-b flex items-center gap-4 px-6 py-3 shrink-0"
        style={{
          background: 'linear-gradient(180deg, hsl(220 25% 11%) 0%, hsl(220 25% 9%) 100%)',
          borderColor: 'hsl(43 60% 35%)',
        }}
      >
        <img
          src="/gargoyle.jpg"
          alt="Gargoyle Ace of Spades"
          className="h-14 w-14 rounded-full object-cover shadow-lg"
          style={{ border: '2px solid hsl(43 80% 45%)', boxShadow: '0 0 12px hsl(43 60% 30%)' }}
        />
        <div>
          <h1
            className="text-2xl font-bold tracking-wide"
            style={{
              background: 'linear-gradient(135deg, hsl(43 90% 60%), hsl(43 70% 42%), hsl(43 90% 65%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.05em',
            }}
          >
            Bridge Deal Editor
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'hsl(215 15% 50%)' }}>
            Professional Hand Analysis Tool
          </p>
        </div>
        {board && (
          <div
            className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: 'hsl(150 50% 15%)', border: '1px solid hsl(150 40% 28%)', color: 'hsl(150 60% 65%)' }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Board {board['Board number']} · {playCards.size} play cards
          </div>
        )}
      </header>

      {/* Toolbar */}
      <div
        className="w-full px-6 py-4 border-b flex flex-wrap gap-4 items-end justify-center"
        style={{ background: 'hsl(220 22% 11%)', borderColor: 'hsl(220 18% 20%)' }}
      >
        {/* Load JSON */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>
            Load JSON File
          </label>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded cursor-pointer text-sm font-medium transition-colors"
            style={{
              background: 'hsl(220 18% 18%)',
              border: '1px solid hsl(220 18% 28%)',
              color: 'hsl(210 20% 80%)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            Choose File
            <input type="file" accept=".json" onChange={loadJsonFile} className="hidden" />
          </label>
        </div>

        {/* BBO URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>
            Import BBO URL
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Paste BBO URL here..."
              value={bboUrl}
              onChange={(e) => setBboUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && importBboUrl()}
              className="w-72 text-sm"
              style={{
                background: 'hsl(220 18% 18%)',
                border: '1px solid hsl(220 18% 28%)',
                color: 'hsl(210 20% 88%)',
              }}
            />
            <Button
              onClick={importBboUrl}
              className="px-4 text-sm font-semibold"
              style={{
                background: 'hsl(43 70% 42%)',
                color: 'hsl(220 25% 8%)',
                border: 'none',
              }}
            >
              Import
            </Button>
          </div>
        </div>

        {/* Actions */}
        {board && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>
              Actions
            </label>
            <div className="flex gap-2">
              <Button
                onClick={exportJson}
                className="px-4 text-sm font-semibold"
                style={{
                  background: 'hsl(43 70% 42%)',
                  color: 'hsl(220 25% 8%)',
                  border: 'none',
                }}
              >
                Export JSON
              </Button>
              <Button
                onClick={clearPlaySequence}
                variant="outline"
                className="px-4 text-sm"
                style={{
                  background: 'hsl(220 18% 18%)',
                  border: '1px solid hsl(220 18% 30%)',
                  color: 'hsl(210 20% 75%)',
                }}
              >
                Clear Play
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 flex flex-col items-center">
        {board ? (
          <>
            {/* Instructions bar */}
            <div
              className="w-full max-w-5xl mb-5 px-5 py-3 rounded-lg flex flex-wrap gap-x-6 gap-y-1 text-xs"
              style={{
                background: 'hsl(220 22% 13%)',
                border: '1px solid hsl(220 18% 22%)',
                color: 'hsl(215 15% 55%)',
              }}
            >
              <span><span style={{ color: 'hsl(43 70% 55%)' }}>Drag</span> cards between hands to move them</span>
              <span><span style={{ color: 'hsl(43 70% 55%)' }}>Click twice</span> to add a card to the play sequence</span>
              <span><span style={{ color: 'hsl(43 70% 55%)' }}>Click numbered</span> cards to remove from sequence</span>
              <span className="ml-auto font-semibold" style={{ color: 'hsl(150 60% 55%)' }}>
                Play sequence: {playCards.size} card{playCards.size !== 1 ? 's' : ''}
              </span>
            </div>

            <BridgeTable
              board={board}
              selectedCards={selectedCards}
              playCards={playCards}
              onCardClick={handleCardClick}
              onCardDragStart={handleCardDragStart}
              onCardDrop={handleCardDrop}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-8 py-16">
            <img
              src="/gargoyle.jpg"
              alt="Gargoyle"
              className="w-36 h-36 rounded-full object-cover opacity-40"
              style={{ border: '2px solid hsl(43 60% 35%)' }}
            />
            <div className="text-center space-y-3">
              <p className="text-xl font-medium" style={{ color: 'hsl(210 20% 60%)' }}>
                No deal loaded
              </p>
              <p className="text-sm" style={{ color: 'hsl(215 15% 42%)' }}>
                Load a JSON file or paste a BBO URL above to begin editing
              </p>
            </div>
            <div
              className="grid grid-cols-2 gap-3 text-xs max-w-sm w-full"
              style={{ color: 'hsl(215 15% 50%)' }}
            >
              {[
                ['♠', 'Spades', 'hsl(220 25% 85%)'],
                ['♥', 'Hearts', 'hsl(0 80% 60%)'],
                ['♦', 'Diamonds', 'hsl(0 80% 60%)'],
                ['♣', 'Clubs', 'hsl(220 25% 85%)'],
              ].map(([sym, name, color]) => (
                <div key={name as string}
                  className="flex items-center gap-2 px-4 py-2 rounded"
                  style={{ background: 'hsl(220 22% 13%)', border: '1px solid hsl(220 18% 22%)' }}
                >
                  <span className="text-lg" style={{ color: color as string }}>{sym}</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
