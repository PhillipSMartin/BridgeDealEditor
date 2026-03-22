import React from 'react';
import { BridgeBoard, Direction } from '@/types/bridge';

interface AuctionDisplayProps {
  board: BridgeBoard;
}

const COL_ORDER: Direction[] = ['West', 'North', 'East', 'South'];

const DIR_LABEL: Record<Direction, string> = {
  West: 'W', North: 'N', East: 'E', South: 'S',
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

function callColor(formatted: string): string {
  if (formatted.includes('♥') || formatted.includes('♦')) return 'hsl(0 80% 62%)';
  if (formatted === 'Pass') return 'hsl(215 15% 52%)';
  if (formatted === 'Dbl') return 'hsl(20 90% 60%)';
  if (formatted === 'Rdbl') return 'hsl(200 80% 60%)';
  return 'hsl(210 20% 88%)';
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

  // Pad to multiple of 4
  const padded = [...cells];
  while (padded.length % 4 !== 0) padded.push('');

  const rows: string[][] = [];
  for (let i = 0; i < padded.length; i += 4) {
    rows.push(padded.slice(i, i + 4));
  }

  const colW = 'w-1/4';
  const cellBase = `${colW} text-sm py-1.5 px-2`;

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
          {row.map((cell, ci) => {
            const color = cell ? callColor(cell) : 'transparent';
            const isAllPass = cell === '(All pass)';
            return (
              <div
                key={ci}
                className={`${cellBase} ${isAllPass ? 'col-span-4' : ''} text-center font-medium`}
                style={{ color, fontStyle: cell === 'Pass' || isAllPass ? 'italic' : 'normal' }}
              >
                {cell || ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
