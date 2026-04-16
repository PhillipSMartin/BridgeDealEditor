import React, { useState, useEffect, useCallback } from 'react';
import { Direction, Vulnerability } from '@/types/bridge';

export interface BoardInfoValues {
  boardNumber: number;
  dealer: Direction;
  vulnerability: Vulnerability;
  playerNames: Record<Direction, string>;
}

interface BoardInfoDialogProps {
  open: boolean;
  initial: BoardInfoValues;
  hasAuction: boolean;
  onSave: (values: BoardInfoValues) => void;
  onCancel: () => void;
}

const DIRECTIONS: Direction[] = ['North', 'East', 'South', 'West'];
const VULNERABILITIES: Vulnerability[] = ['None', 'NS', 'EW', 'Both'];

const inputStyle: React.CSSProperties = {
  background: 'hsl(220 18% 14%)',
  border: '1px solid hsl(220 18% 28%)',
  borderRadius: 6,
  color: 'hsl(210 20% 88%)',
  padding: '7px 10px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'hsl(43 70% 55%)',
  marginBottom: 4,
  display: 'block',
};

export const BoardInfoDialog: React.FC<BoardInfoDialogProps> = ({
  open,
  initial,
  hasAuction,
  onSave,
  onCancel,
}) => {
  const [boardNumberStr, setBoardNumberStr] = useState(String(initial.boardNumber));
  const [dealer, setDealer] = useState<Direction>(initial.dealer);
  const [vulnerability, setVulnerability] = useState<Vulnerability>(initial.vulnerability);
  const [playerNames, setPlayerNames] = useState<Record<Direction, string>>(initial.playerNames);
  const [showDealerWarning, setShowDealerWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setBoardNumberStr(String(initial.boardNumber));
      setDealer(initial.dealer);
      setVulnerability(initial.vulnerability);
      setPlayerNames(initial.playerNames);
      setShowDealerWarning(false);
    }
  }, [open, initial]);

  const parsedBoardNumber = parseInt(boardNumberStr, 10);
  const boardNumberValid = Number.isFinite(parsedBoardNumber) && parsedBoardNumber >= 1;

  const handlePlayerName = useCallback((dir: Direction, value: string) => {
    setPlayerNames(prev => ({ ...prev, [dir]: value }));
  }, []);

  const commitSave = () => {
    onSave({ boardNumber: parsedBoardNumber, dealer, vulnerability, playerNames });
  };

  const handleSave = () => {
    if (!boardNumberValid) return;
    if (dealer !== initial.dealer && hasAuction) {
      setShowDealerWarning(true);
      return;
    }
    commitSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showDealerWarning) { setShowDealerWarning(false); return; }
      onCancel();
    }
    if (e.key === 'Enter' && e.ctrlKey && !showDealerWarning) handleSave();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: 'hsl(220 25% 10%)',
          border: '1px solid hsl(43 55% 32%)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          padding: '28px 32px 24px',
          width: 440,
          maxWidth: '95vw',
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              background: 'linear-gradient(135deg, hsl(43 90% 60%), hsl(43 70% 42%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.04em',
            }}
          >
            Board Info
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'hsl(215 15% 48%)' }}>
            Edit board metadata and player names
          </p>
        </div>

        {/* Board number */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Board Number</label>
          <input
            type="number"
            min={1}
            value={boardNumberStr}
            onChange={e => setBoardNumberStr(e.target.value)}
            style={{
              ...inputStyle,
              width: 120,
              borderColor: boardNumberValid ? 'hsl(220 18% 28%)' : 'hsl(0 70% 50%)',
            }}
          />
          {!boardNumberValid && (
            <span style={{ fontSize: 11, color: 'hsl(0 70% 55%)', marginTop: 3, display: 'block' }}>
              Must be a positive whole number
            </span>
          )}
        </div>

        {/* Dealer + Vulnerability row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Dealer</label>
            <select
              value={dealer}
              onChange={e => setDealer(e.target.value as Direction)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {DIRECTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Vulnerability</label>
            <select
              value={vulnerability}
              onChange={e => setVulnerability(e.target.value as Vulnerability)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {VULNERABILITIES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Player names */}
        <div
          style={{
            borderTop: '1px solid hsl(220 18% 20%)',
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <span style={{ ...labelStyle, marginBottom: 12 }}>Player Names</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {DIRECTIONS.map(dir => (
              <div key={dir}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'hsl(215 15% 52%)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  {dir}
                </label>
                <input
                  type="text"
                  value={playerNames[dir]}
                  onChange={e => handlePlayerName(dir, e.target.value)}
                  placeholder={dir}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dealer-change warning or normal buttons */}
        {showDealerWarning ? (
          <div>
            <div
              style={{
                background: 'hsl(38 80% 12%)',
                border: '1px solid hsl(38 70% 35%)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14,
                fontSize: 13,
                color: 'hsl(38 85% 72%)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4, color: 'hsl(38 90% 78%)' }}>
                ⚠ Changing the dealer will clear the existing auction.
              </strong>
              Do you want to continue?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDealerWarning(false)}
                style={{
                  padding: '8px 20px',
                  background: 'hsl(220 18% 18%)',
                  border: '1px solid hsl(220 18% 30%)',
                  borderRadius: 6,
                  color: 'hsl(210 20% 68%)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Keep editing
              </button>
              <button
                onClick={commitSave}
                style={{
                  padding: '8px 20px',
                  background: 'hsl(0 60% 38%)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'hsl(0 0% 95%)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Yes, clear auction
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 20px',
                background: 'hsl(220 18% 18%)',
                border: '1px solid hsl(220 18% 30%)',
                borderRadius: 6,
                color: 'hsl(210 20% 68%)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!boardNumberValid}
              style={{
                padding: '8px 24px',
                background: boardNumberValid ? 'hsl(43 70% 42%)' : 'hsl(43 40% 26%)',
                border: 'none',
                borderRadius: 6,
                color: boardNumberValid ? 'hsl(220 25% 8%)' : 'hsl(220 20% 40%)',
                fontSize: 13,
                fontWeight: 700,
                cursor: boardNumberValid ? 'pointer' : 'not-allowed',
                letterSpacing: '0.04em',
                opacity: boardNumberValid ? 1 : 0.6,
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
