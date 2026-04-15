import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BridgeTable } from './BridgeTable';
import { AuctionDisplay } from './AuctionDisplay';
import { BboUrlBuilder } from './BboUrlBuilder';
import { HtmlBuilder } from './HtmlBuilder';
import { BridgeBoard, Direction, Suit } from '@/types/bridge';
import { LinParser } from '@/utils/linParser';
import { parsePbn } from '@/utils/pbnParser';
import { buildPbn } from '@/utils/buildPbn';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

function findTerminationPoint(auction: string[]): number | null {
  let hasNonPass = false;
  let passStreak = 0;
  for (let i = 0; i < auction.length; i++) {
    if (auction[i] === 'P') {
      passStreak++;
      if (!hasNonPass && passStreak === 4) return 4;
      if (hasNonPass && passStreak === 3) return i + 1;
    } else {
      hasNonPass = true;
      passStreak = 0;
    }
  }
  return null;
}

const ROTATE_DIRECTION: Record<Direction, Direction> = {
  North: 'East',
  East: 'South',
  South: 'West',
  West: 'North',
};

const DIRECTION_FULL: Record<string, Direction> = {
  N: 'North', NORTH: 'North',
  E: 'East',  EAST:  'East',
  S: 'South', SOUTH: 'South',
  W: 'West',  WEST:  'West',
};

function normalizeDealer(raw: unknown): Direction {
  if (!raw) return 'North';
  const key = String(raw).trim().toUpperCase();
  return DIRECTION_FULL[key] ?? 'North';
}

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
  const [exportOpen, setExportOpen] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  const initializeBoardData = useCallback((boardData: BridgeBoard) => {
    const dealer = normalizeDealer(boardData.Dealer);
    const auction = (boardData.Auction ?? []).filter((c: string) => c !== '');
    setBoard({ ...boardData, Dealer: dealer, Auction: auction });
    const newPlayCards = new Map<string, number>();
    boardData.Play.forEach((card: string, index: number) => {
      newPlayCards.set(card, index + 1);
    });
    setPlayCards(newPlayCards);
    setPlayOrderCounter(boardData.Play.length + 1);
    setSelectedCards(new Set());
  }, []);

  const loadFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (ext === 'json') {
          const jsonData = JSON.parse(text);
          initializeBoardData(jsonData);
          setLoadedFileName(file.name);
          toast('JSON file loaded successfully!');
        } else {
          const boardData = parsePbn(text);
          initializeBoardData(boardData);
          setLoadedFileName(file.name);
          toast('PBN file loaded successfully!');
        }
      } catch (error) {
        toast(`Error loading file. Please check the format.`);
        console.error('File load error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
        setLoadedFileName('');
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

  const handleEditAuctionCall = useCallback((index: number, rawCall: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const newAuction = [...(prev.Auction ?? [])];
      newAuction[index] = rawCall;
      // '?' must always be the last call — truncate everything after it
      if (rawCall === '?') return { ...prev, Auction: newAuction.slice(0, index + 1) };
      const terminationPoint = findTerminationPoint(newAuction);
      return { ...prev, Auction: terminationPoint != null ? newAuction.slice(0, terminationPoint) : newAuction };
    });
  }, []);

  const handleClearAuction = useCallback(() => {
    setBoard(prev => prev ? { ...prev, Auction: [] } : prev);
  }, []);

  const handleDeleteAuctionCall = useCallback((index: number) => {
    setBoard(prev => {
      if (!prev) return prev;
      return { ...prev, Auction: (prev.Auction ?? []).slice(0, index) };
    });
  }, []);

  const handleNameChange = useCallback((direction: Direction, newName: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const newSeats = prev.Seats.map(seat => {
        if (seat.Direction !== direction) return seat;
        if (newName === '') {
          const { Player: _removed, ...rest } = seat;
          return rest as typeof seat;
        }
        return { ...seat, Player: newName };
      });
      return { ...prev, Seats: newSeats };
    });
  }, []);

  const handleAppendAuctionCall = useCallback((rawCall: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      return { ...prev, Auction: [...(prev.Auction ?? []), rawCall] };
    });
  }, []);

  const rotateDeal = useCallback(() => {
    if (!board) return;
    const rotated: BridgeBoard = {
      ...board,
      Dealer: ROTATE_DIRECTION[board.Dealer as Direction] ?? board.Dealer,
      Seats: board.Seats.map(seat => ({
        ...seat,
        Direction: ROTATE_DIRECTION[seat.Direction] ?? seat.Direction,
      })),
    };
    setBoard(rotated);
    toast('Deal rotated');
  }, [board]);

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

  const exportPbn = useCallback(() => {
    if (!board) return;
    const playSequence = Array.from(playCards.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([card]) => card);
    const exportData = { ...board, Play: playSequence };
    const pbnStr = buildPbn(exportData);
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(pbnStr);
    const filename = `board${board['Board number']}.pbn`;
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
    toast('PBN file exported successfully!');
  }, [board, playCards]);

  const buildBboUrl = useCallback((currentBoard: BridgeBoard, currentPlayCards: Map<string, number>): string => {
    const directions: Direction[] = ['West', 'North', 'East', 'South'];
    const southIdx = directions.indexOf('South');
    const directionsSouthFirst: Direction[] = [
      ...directions.slice(southIdx),
      ...directions.slice(0, southIdx),
    ];

    const seatMap: Record<string, typeof currentBoard.Seats[0]> = {};
    for (const seat of currentBoard.Seats) {
      seatMap[seat.Direction] = seat;
    }

    const players = directionsSouthFirst.map(d => seatMap[d]?.Player ?? '');
    const playersStr = players.join(',');

    const hands: string[] = [];
    for (let i = 0; i < directionsSouthFirst.length; i++) {
      const d = directionsSouthFirst[i];
      const seat = seatMap[d];
      const hand = seat?.Hand;
      const s = hand?.Spades ?? '';
      const h = hand?.Hearts ?? '';
      const dm = hand?.Diamonds ?? '';
      const c = hand?.Clubs ?? '';

      let prefix = '';
      if (i === 0) {
        const dealer = currentBoard.Dealer ?? directions[0];
        const dIdx = directions.indexOf(dealer as Direction);
        let num = (dIdx + 2) % 4;
        if (num === 0) num = 4;
        prefix = String(num);
      }
      hands.push(`${prefix}S${s}H${h}D${dm}C${c}`);
    }

    const mdParam = hands.join(',');
    const auction = (currentBoard.Auction ?? []).filter(c => c !== '?').join('');

    const playSequence = Array.from(currentPlayCards.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([card]) => card);
    const playEntries = playSequence.map(card => `pc|${card}|`).join('');

    const boardNum = currentBoard['Board number'];
    const boardPart = boardNum != null ? `Board%20${boardNum}|` : '';

    return `https://www.bridgebase.com/tools/handviewer.html?lin=pn|${playersStr}|st||md|${mdParam}|ah|${boardPart}mb|${auction}|${playEntries}`;
  }, []);

  const copyUrl = useCallback(() => {
    if (!board) return;
    const url = buildBboUrl(board, playCards);
    navigator.clipboard.writeText(url).then(() => {
      toast('BBO URL copied to clipboard!');
    }).catch(() => {
      toast('Failed to copy URL. Please try again.');
    });
  }, [board, playCards, buildBboUrl]);

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
            Professional Deal Editing Tool
          </p>
        </div>
        {board && (
          <div className="ml-auto flex flex-col items-end gap-1">
            {loadedFileName && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'hsl(220 22% 16%)', color: 'hsl(215 15% 55%)', fontFamily: 'monospace' }}
                title={loadedFileName}
              >
                {loadedFileName}
              </span>
            )}
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'hsl(150 50% 15%)', border: '1px solid hsl(150 40% 28%)', color: 'hsl(150 60% 65%)' }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Board {board['Board number']} · {playCards.size} played cards
            </div>
          </div>
        )}
      </header>

      {/* Toolbar */}
      <div
        className="w-full px-6 pt-4 border-b flex flex-col gap-3"
        style={{ background: 'hsl(220 22% 11%)', borderColor: 'hsl(220 18% 20%)' }}
      >
        {/* Row 1: Import controls */}
        <div className="flex flex-wrap gap-4 items-end justify-center pb-3">
          {/* Load file */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(43 70% 55%)' }}>
              Load File
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
              <input type="file" accept=".json,.pbn,.txt" onChange={loadFile} className="hidden" />
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
        </div>

        {/* Row 2: Edit actions (only when a board is loaded) */}
        {board && (
          <div
            className="flex flex-wrap gap-2 items-center justify-center py-3 border-t"
            style={{ borderColor: 'hsl(220 18% 20%)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest mr-2" style={{ color: 'hsl(43 70% 55%)' }}>
              Edit
            </span>
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
            <Button
              onClick={rotateDeal}
              variant="outline"
              className="px-4 text-sm flex items-center gap-2"
              style={{
                background: 'hsl(220 18% 18%)',
                border: '1px solid hsl(220 18% 30%)',
                color: 'hsl(210 20% 75%)',
              }}
            >
              <RefreshCw size={14} />
              Rotate
            </Button>
          </div>
        )}

        {/* Row 3: Output actions (only when a board is loaded) */}
        {board && (
          <div
            className="flex flex-wrap gap-2 items-center justify-center py-3 border-t"
            style={{ borderColor: 'hsl(220 18% 20%)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest mr-2" style={{ color: 'hsl(43 70% 55%)' }}>
              Output
            </span>
            <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
              <Button
                onClick={() => setExportOpen(o => !o)}
                className="px-4 text-sm font-semibold"
                style={{
                  background: 'hsl(43 70% 42%)',
                  color: 'hsl(220 25% 8%)',
                  border: 'none',
                  gap: 6,
                }}
              >
                Export
                <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
              </Button>
              {exportOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  zIndex: 50,
                  minWidth: 140,
                  background: 'hsl(220 22% 13%)',
                  border: '1px solid hsl(43 50% 35%)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {[
                    { label: 'JSON',    action: () => { exportJson(); setExportOpen(false); }, enabled: true },
                    { label: 'PBN',     action: () => { exportPbn(); setExportOpen(false); }, enabled: true },
                    { label: 'BBO URL', action: () => { copyUrl();    setExportOpen(false); }, enabled: true },
                    { label: 'LIN',     action: null, enabled: false },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action ?? undefined}
                      disabled={!item.enabled}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: item.enabled ? 'hsl(43 70% 60%)' : 'hsl(215 15% 40%)',
                        cursor: item.enabled ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (item.enabled) (e.currentTarget as HTMLElement).style.background = 'hsl(220 22% 20%)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {item.label}
                      {!item.enabled && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.5 }}>soon</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <BboUrlBuilder board={board} playCards={playCards} />
            <HtmlBuilder board={board} playCards={playCards} />
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
              onNameChange={handleNameChange}
            />

            {/* Auction table */}
            <div className="w-full max-w-5xl mt-6">
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-2 text-center"
                style={{ color: 'hsl(43 70% 55%)' }}
              >
                Auction
              </div>
              <AuctionDisplay
                board={board}
                onEditCall={handleEditAuctionCall}
                onDeleteCall={handleDeleteAuctionCall}
                onAppendCall={handleAppendAuctionCall}
                onClearAuction={handleClearAuction}
              />
            </div>
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
                Load a JSON or PBN file, or paste a BBO URL above to begin editing
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
