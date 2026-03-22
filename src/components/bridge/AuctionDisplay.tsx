import React, { useState } from 'react';
import { BridgeBoard, Direction } from '@/types/bridge';

interface AuctionDisplayProps {
  board: BridgeBoard;
  onEditCall?: (auctionIndex: number, rawCall: string) => void;
  onDeleteCall?: (auctionIndex: number) => void;
  onAppendCall?: (rawCall: string) => void;
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

  const pipMatch = cell.match(/^(\d)([\u2660\u2665\u2666\u2663])$/);
  if (pipMatch) {
    return (
      <>
        <span style={{ color: 'hsl(210 20% 95%)' }}>{pipMatch[1]}</span>
        <span style={{ color: PIP_COLOR[pipMatch[2]] }}>{pipMatch[2]}</span>
      </>
    );
  }

  const ntMatch = cell.match(/^(\d)(NT)$/);
  if (ntMatch) {
    return <span style={{ color: 'hsl(210 20% 95%)' }}>{cell}</span>;
  }

  if (cell === 'Pass') {
    return <span style={{ color: 'hsl(215 15% 52%)', fontStyle: 'italic' }}>{cell}</span>;
  }
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

// Popup sub-component
interface EditPopupProps {
  onSelect: (rawCall: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  showDelete?: boolean;
}

const SUITS_ROW = [
  { label: '♣', raw: 'C', color: 'hsl(210 20% 88%)' },
  { label: '♦', raw: 'D', color: 'hsl(0 80% 62%)' },
  { label: '♥', raw: 'H', color: 'hsl(0 80% 62%)' },
  { label: '♠', raw: 'S', color: 'hsl(210 20% 88%)' },
  { label: 'NT', raw: 'N', color: 'hsl(210 20% 95%)' },
];

const EditPopup: React.FC<EditPopupProps> = ({ onSelect, onDelete, onCancel, showDelete = true }) => {
  const [level, setLevel] = useState<string | null>(null);

  const btnBase: React.CSSProperties = {
    background: 'hsl(220 22% 20%)',
    border: '1px solid hsl(220 18% 30%)',
    borderRadius: 6,
    color: 'hsl(210 20% 88%)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    padding: '6px 0',
    minWidth: 44,
    textAlign: 'center',
    transition: 'background 0.1s',
  };

  const btnHighlight: React.CSSProperties = {
    ...btnBase,
    background: 'hsl(43 70% 30%)',
    border: '1px solid hsl(43 70% 50%)',
    color: 'hsl(43 90% 85%)',
  };

  const handleSuit = (suitRaw: string) => {
    if (!level) return;
    onSelect(level + suitRaw);
  };

  return (
    // Backdrop
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'hsla(220 25% 4% / 0.6)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'hsl(220 22% 15%)',
          border: '1px solid hsl(43 50% 35%)',
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minWidth: 280,
          boxShadow: '0 8px 40px hsl(220 25% 4%)',
        }}
      >
        <div style={{ color: 'hsl(43 80% 55%)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Edit Call
        </div>

        {/* Row 1: Pass / Dbl / Rdbl */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Pass', raw: 'P', color: 'hsl(215 15% 60%)' },
            { label: 'Dbl',  raw: 'D', color: 'hsl(20 90% 60%)' },
            { label: 'Rdbl', raw: 'R', color: 'hsl(200 80% 60%)' },
          ].map(({ label, raw, color }) => (
            <button
              key={raw}
              onClick={() => onSelect(raw)}
              style={{ ...btnBase, color, flex: 1 }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 2: Levels 1-7 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['1','2','3','4','5','6','7'].map(n => (
            <button
              key={n}
              onClick={() => setLevel(n)}
              style={level === n ? btnHighlight : { ...btnBase, flex: 1 }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Row 3: Suits + NT */}
        <div style={{ display: 'flex', gap: 8 }}>
          {SUITS_ROW.map(({ label, raw, color }) => (
            <button
              key={raw}
              onClick={() => handleSuit(raw)}
              disabled={!level}
              style={{
                ...btnBase,
                flex: 1,
                color,
                opacity: level ? 1 : 0.35,
                cursor: level ? 'pointer' : 'not-allowed',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 4: Delete + Cancel */}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          {showDelete && (
            <button
              onClick={onDelete}
              style={{
                ...btnBase,
                flex: 1,
                color: 'hsl(0 70% 60%)',
                border: '1px solid hsl(0 50% 30%)',
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onCancel}
            style={{
              ...btnBase,
              flex: 1,
              color: 'hsl(215 15% 52%)',
              border: '1px solid hsl(220 18% 24%)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuctionDisplay: React.FC<AuctionDisplayProps> = ({ board, onEditCall, onDeleteCall, onAppendCall }) => {
  const [editState, setEditState] = useState<{ auctionIndex: number; isAppend: boolean } | null>(null);

  const playerMap = Object.fromEntries(
    board.Seats.map(s => [s.Direction, s.Player])
  ) as Record<Direction, string>;

  const leadingBlanks = COL_ORDER.indexOf(board.Dealer);
  const cells = buildCells(board.Auction ?? [], board.Dealer);

  const padded = [...cells];
  while (padded.length % 4 !== 0) padded.push('');

  const rows: string[][] = [];
  for (let i = 0; i < padded.length; i += 4) {
    rows.push(padded.slice(i, i + 4));
  }

  const handleCellClick = (paddedIndex: number) => {
    if (!onEditCall) return;
    const auctionIndex = paddedIndex - leadingBlanks;
    if (auctionIndex < 0 || auctionIndex >= (board.Auction ?? []).length) return;
    setEditState({ auctionIndex, isAppend: false });
  };

  const handleSelect = (rawCall: string) => {
    if (editState) {
      if (editState.isAppend && onAppendCall) {
        onAppendCall(rawCall);
      } else if (!editState.isAppend && onEditCall) {
        onEditCall(editState.auctionIndex, rawCall);
      }
    }
    setEditState(null);
  };

  const handleDelete = () => {
    if (editState && !editState.isAppend && onDeleteCall) {
      onDeleteCall(editState.auctionIndex);
    }
    setEditState(null);
  };

  const handleAddCall = () => {
    if (!onAppendCall) return;
    setEditState({ auctionIndex: -1, isAppend: true });
  };

  const colW = 'w-1/4';
  const cellBase = `${colW} text-sm py-1.5 px-2 text-center font-medium`;

  return (
    <>
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
              const paddedIndex = ri * 4 + ci;
              const auctionIndex = paddedIndex - leadingBlanks;
              const isEditable = onEditCall && auctionIndex >= 0 && auctionIndex < (board.Auction ?? []).length;
              return (
                <div
                  key={ci}
                  className={cellBase}
                  onClick={() => handleCellClick(paddedIndex)}
                  style={{
                    cursor: isEditable ? 'pointer' : 'default',
                    borderRadius: 4,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (isEditable) (e.currentTarget as HTMLElement).style.background = 'hsl(220 22% 20%)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {renderCallContent(cell)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add Call button */}
      {onAppendCall && (
        <div className="flex justify-center mt-3">
          <button
            onClick={handleAddCall}
            style={{
              background: 'hsl(220 22% 18%)',
              border: '1px dashed hsl(220 18% 32%)',
              borderRadius: 8,
              color: 'hsl(43 70% 55%)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '6px 20px',
              textTransform: 'uppercase',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'hsl(220 22% 22%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(43 50% 40%)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'hsl(220 22% 18%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(220 18% 32%)';
            }}
          >
            + Add Call
          </button>
        </div>
      )}

      {editState && (
        <EditPopup
          onSelect={handleSelect}
          onDelete={handleDelete}
          onCancel={() => setEditState(null)}
          showDelete={!editState.isAppend}
        />
      )}
    </>
  );
};
