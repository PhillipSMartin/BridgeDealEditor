import React from 'react';
import { BridgeBoard, Direction } from '@/types/bridge';

interface AuctionDisplayProps {
  board: BridgeBoard;
}

const COL_ORDER: Direction[] = ['West', 'North', 'East', 'South'];

const DIR_LABEL: Record<Direction, string> = {
  West: 'W', North: 'N', East: 'E', South: 'S',
};

const PIP_COLOR: Record<string, string> = {
  '♠': 'hsl(210 20% 88%)',
  '♥': 'hsl(0 80% 62%)',
  '♦': 'hsl(0 80% 62%)',
  '♣': 'hsl(210 20% 88%)',
};

function formatCall(call: string): string {
  if (call === 'P') return 'Pass';
  if (call === 'D') return 'Dbl';
  if (call === 'R') return 'Rdbl';
  return call
    .replace('S', '♠')
    .replace('H', '♥')
    .replace('D', '♦')
    .replace('C', '♣')
    .replace('N', 'NT');
}

function renderCallContent(cell: string): React.ReactNode {
  if (!cell) return null;

  // Bids: level digit followed by a pip or "NT"
  const pipMatch = cell.match(/^(\d)([\u2660\u2665\u2666\u2663])$/);
  if (pipMatch) {
    return (
      <>
        <span style={{ color: 'hsl(210 20% 95%)' }}>{pipMatch[1]}</span>
        <span style={{ color: PIP_COLOR[pipMatch[2]] }}>{pipMatch[2]}</span>
      </>
    );
  }

  // No-trump bids like "3NT"
  const ntMatch = cell.match(/^(\d)(NT)$/);
  if (ntMatch) {
    return <span style={{ color: 'hsl(210 20% 95%)' }}>{cell}</span>;
  }

  // Pass — muted italic
  if (cell === 'Pass') {
    return <span style={{ color: 'hsl(215 15% 52%)', fontStyle: 'italic' }}>{cell}</span>;
  }

  // Dbl / Rdbl
  if (cell === 'Dbl') {
    return <span style={{ color: 'hsl(20 90% 60%)' }}>{cell}</span>;
  }
  if (cell === 'Rdbl') {
    return <span style={{ color: 'hsl(200 80% 60%)' }}>{cell}</span>;
  }

  return <span style={{ color: 'hsl(210 20% 88%)' }}>{cell}</span>;
}

function buildCells(auction: string[], dealer: Direction): string[] {
  const formatted = auction.map(formatCall);
  const leadingBlanks = COL_ORDER.indexOf(dealer);
  return [...Array(leadingBlanks).fill(''), ...formatted];
}

export const AuctionDisplay: React.FC<AuctionDisplayProps> = ({ board }) => {
  const playerMap = Object.fromEntries(
    board.Seats.map(s => [s.Direction, s.Player])
  ) as Record<Direction, string>;

  const cells = buildCells(board.Auction ?? [], board.Dealer);

  const padded = [...cells];
  while (padded.length % 4 !== 0) padded.push('');

  const rows: string[][] = [];
  for (let i = 0; i < padded.length; i += 4) {
    rows.push(padded.slice(i, i + 4));
  }

  const colW = 'w-1/4';
  const cellBase = `${colW} text-sm py-1.5 px-2 text-center font-medium`;

  return (
    <div
      className="w-full max-w-sm mx-auto rounded-xl overflow-hidden"
      style={{
        background: 'hsl(220 22% 13%)',
        border: '1px solid hsl(220 18% 22%)',
      }}
    >
      {/* Direction header */}
      <div
        className="flex"
        style={{ background: 'hsl(220 25% 10%)', borderBottom: '1px solid hsl(220 18% 22%)' }}
      >
        {COL_ORDER.map(dir => (
          <div
            key={dir}
            className={`${colW} text-center py-1.5 text-xs font-bold tracking-widest`}
            style={{ color: 'hsl(43 80% 55%)' }}
          >
            {DIR_LABEL[dir]}
          </div>
        ))}
      </div>

      {/* Player names */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid hsl(220 18% 22%)' }}
      >
        {COL_ORDER.map(dir => (
          <div
            key={dir}
            className={`${colW} text-center py-1 text-xs truncate px-1`}
            style={{ color: 'hsl(215 15% 52%)' }}
            title={playerMap[dir] ?? ''}
          >
            {playerMap[dir] ?? '—'}
          </div>
        ))}
      </div>

      {/* Auction rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="flex"
          style={{
            borderBottom: ri < rows.length - 1 ? '1px solid hsl(220 18% 18%)' : undefined,
          }}
        >
          {row.map((cell, ci) => (
            <div key={ci} className={cellBase}>
              {renderCallContent(cell)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
