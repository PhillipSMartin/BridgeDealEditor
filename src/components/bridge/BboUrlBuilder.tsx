import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BridgeBoard, Direction, Hand } from '@/types/bridge';
import { toast } from 'sonner';

type PresentationType =
  | 'single-hand'
  | 'pair-hands'
  | 'bidding-only'
  | 'hands-with-bidding'
  | 'all-hands'
  | 'bridge-movie';

interface BboUrlBuilderProps {
  board: BridgeBoard;
  playCards: Map<string, number>;
}

const DIRECTIONS: Direction[] = ['North', 'South', 'East', 'West'];
const DIR_PARAM: Record<Direction, string> = { North: 'n', South: 's', East: 'e', West: 'w' };
const VUL_OPTIONS = [
  { label: 'None', value: '-' },
  { label: 'NS', value: 'n' },
  { label: 'EW', value: 'e' },
  { label: 'Both', value: 'b' },
];

const PRESENTATION_TYPES: { value: PresentationType; label: string; description: string }[] = [
  { value: 'single-hand', label: 'Single hand', description: 'Display one player\'s hand' },
  { value: 'pair-hands', label: 'Pair of hands', description: 'Display hands for any two directions (e.g. NS, EW)' },
  { value: 'bidding-only', label: 'Bidding diagram', description: 'Display the auction only, no hands' },
  { value: 'hands-with-bidding', label: 'Hand(s) with bidding', description: 'Display selected hands alongside the auction' },
  { value: 'all-hands', label: 'All four hands', description: 'Display all four hands' },
  { value: 'bridge-movie', label: 'Bridge movie', description: 'All four hands with the play sequence' },
];

function handToParam(hand: Hand): string {
  return `s${hand.Spades.toLowerCase()}h${hand.Hearts.toLowerCase()}d${hand.Diamonds.toLowerCase()}c${hand.Clubs.toLowerCase()}`;
}

function auctionToParam(auction: string[]): string {
  return auction.map(c => c.toLowerCase()).join('');
}

function playToParam(playCards: Map<string, number>): string {
  return Array.from(playCards.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([card]) => card.toLowerCase())
    .join('');
}

function buildUrl(
  board: BridgeBoard,
  playCards: Map<string, number>,
  type: PresentationType,
  selectedDirs: Direction[],
  includeNames: boolean,
  includeBoard: boolean,
  vulnerability: string,
): string {
  const base = 'https://www.bridgebase.com/tools/handviewer.html';
  const params = new URLSearchParams();

  const seatMap = Object.fromEntries(board.Seats.map(s => [s.Direction, s]));

  const addHands = (dirs: Direction[]) => {
    for (const dir of dirs) {
      const seat = seatMap[dir];
      if (seat) {
        params.set(DIR_PARAM[dir], handToParam(seat.Hand));
        if (includeNames && seat.Player) {
          params.set(`${DIR_PARAM[dir]}n`, seat.Player);
        }
      }
    }
  };

  if (type === 'single-hand') {
    addHands(selectedDirs.slice(0, 1));
  } else if (type === 'pair-hands') {
    addHands(selectedDirs.slice(0, 2));
  } else if (type === 'bidding-only') {
    params.set('a', auctionToParam(board.Auction));
  } else if (type === 'hands-with-bidding') {
    addHands(selectedDirs);
    params.set('a', auctionToParam(board.Auction));
  } else if (type === 'all-hands') {
    addHands(DIRECTIONS);
  } else if (type === 'bridge-movie') {
    addHands(DIRECTIONS);
    params.set('a', auctionToParam(board.Auction));
    const play = playToParam(playCards);
    if (play) params.set('p', play);
  }

  params.set('d', DIR_PARAM[board.Dealer]);

  if (vulnerability !== 'skip') {
    params.set('v', vulnerability);
  }

  if (includeBoard && board['Board number'] != null) {
    params.set('b', String(board['Board number']));
  }

  return `${base}?${params.toString()}`;
}

export const BboUrlBuilder: React.FC<BboUrlBuilderProps> = ({ board, playCards }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PresentationType>('all-hands');
  const [selectedDirs, setSelectedDirs] = useState<Direction[]>(['South']);
  const [includeNames, setIncludeNames] = useState(true);
  const [includeBoard, setIncludeBoard] = useState(true);
  const [vulnerability, setVulnerability] = useState('skip');

  const toggleDir = (dir: Direction) => {
    setSelectedDirs(prev =>
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    );
  };

  const selectSingleDir = (dir: Direction) => setSelectedDirs([dir]);

  const url = useMemo(() => {
    try {
      return buildUrl(board, playCards, type, selectedDirs, includeNames, includeBoard, vulnerability);
    } catch {
      return '';
    }
  }, [board, playCards, type, selectedDirs, includeNames, includeBoard, vulnerability]);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast('URL copied to clipboard!');
    }).catch(() => toast('Failed to copy URL'));
  };

  const openInBbo = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const needsDirs = type === 'single-hand' || type === 'pair-hands' || type === 'hands-with-bidding';
  const needsVul = type === 'all-hands' || type === 'bridge-movie';

  const inputStyle = {
    background: 'hsl(220 18% 16%)',
    border: '1px solid hsl(220 18% 28%)',
    color: 'hsl(210 20% 85%)',
    borderRadius: '6px',
  };

  const sectionLabel = {
    color: 'hsl(43 70% 55%)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="px-4 text-sm font-semibold"
          style={{
            background: 'hsl(220 18% 18%)',
            border: '1px solid hsl(220 18% 30%)',
            color: 'hsl(210 20% 75%)',
          }}
        >
          Build BBO URL
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl"
        style={{ background: 'hsl(220 22% 11%)', border: '1px solid hsl(220 18% 24%)', color: 'hsl(210 20% 88%)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'hsl(43 80% 60%)', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>
            Generate BBO Handviewer URL
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-1">
          {/* Presentation type */}
          <div>
            <div style={sectionLabel}>Presentation type</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESENTATION_TYPES.map(pt => (
                <label
                  key={pt.value}
                  className="flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: type === pt.value ? 'hsl(220 18% 20%)' : 'hsl(220 18% 15%)',
                    border: type === pt.value ? '1.5px solid hsl(43 60% 40%)' : '1px solid hsl(220 18% 24%)',
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={pt.value}
                    checked={type === pt.value}
                    onChange={() => setType(pt.value)}
                    className="mt-0.5 shrink-0 accent-amber-500"
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'hsl(210 20% 88%)' }}>{pt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 50%)' }}>{pt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Direction selectors */}
          {needsDirs && (
            <div>
              <div style={sectionLabel}>
                {type === 'single-hand' ? 'Select hand to display' : type === 'pair-hands' ? 'Select two hands to display' : 'Select hands to include'}
              </div>
              <div className="flex gap-2 flex-wrap">
                {DIRECTIONS.map(dir => {
                  const seat = board.Seats.find(s => s.Direction === dir);
                  const selected = selectedDirs.includes(dir);
                  return (
                    <label
                      key={dir}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: selected ? 'hsl(43 60% 30%)' : 'hsl(220 18% 15%)',
                        border: selected ? '1.5px solid hsl(43 60% 45%)' : '1px solid hsl(220 18% 24%)',
                        color: selected ? 'hsl(43 90% 75%)' : 'hsl(210 20% 70%)',
                      }}
                    >
                      <input
                        type={type === 'single-hand' ? 'radio' : 'checkbox'}
                        name="dir"
                        checked={selected}
                        onChange={() => type === 'single-hand' ? selectSingleDir(dir) : toggleDir(dir)}
                        className="accent-amber-500"
                      />
                      <span className="text-sm font-semibold">{dir}</span>
                      {seat?.Player && (
                        <span className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>({seat.Player})</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options row */}
          <div className="flex flex-wrap gap-6">
            <div>
              <div style={sectionLabel}>Options</div>
              <div className="flex flex-col gap-2">
                {(type !== 'bidding-only') && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeNames}
                      onChange={e => setIncludeNames(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span style={{ color: 'hsl(210 20% 78%)' }}>Include player names</span>
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBoard}
                    onChange={e => setIncludeBoard(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span style={{ color: 'hsl(210 20% 78%)' }}>Include board number ({board['Board number']})</span>
                </label>
              </div>
            </div>

            {needsVul && (
              <div>
                <div style={sectionLabel}>Vulnerability</div>
                <div className="flex gap-1.5 flex-wrap">
                  <label
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer text-sm"
                    style={{
                      background: vulnerability === 'skip' ? 'hsl(220 18% 22%)' : 'hsl(220 18% 15%)',
                      border: vulnerability === 'skip' ? '1.5px solid hsl(43 50% 40%)' : '1px solid hsl(220 18% 24%)',
                      color: 'hsl(210 20% 75%)',
                    }}
                  >
                    <input type="radio" name="vul" value="skip" checked={vulnerability === 'skip'} onChange={() => setVulnerability('skip')} className="accent-amber-500" />
                    Don't set
                  </label>
                  {VUL_OPTIONS.map(v => (
                    <label
                      key={v.value}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer text-sm"
                      style={{
                        background: vulnerability === v.value ? 'hsl(220 18% 22%)' : 'hsl(220 18% 15%)',
                        border: vulnerability === v.value ? '1.5px solid hsl(43 50% 40%)' : '1px solid hsl(220 18% 24%)',
                        color: 'hsl(210 20% 75%)',
                      }}
                    >
                      <input type="radio" name="vul" value={v.value} checked={vulnerability === v.value} onChange={() => setVulnerability(v.value)} className="accent-amber-500" />
                      {v.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URL preview */}
          <div>
            <div style={sectionLabel}>Generated URL</div>
            <div
              className="rounded-lg p-3 text-xs break-all font-mono"
              style={{ background: 'hsl(220 18% 15%)', border: '1px solid hsl(220 18% 24%)', color: 'hsl(210 20% 60%)', maxHeight: '80px', overflowY: 'auto' }}
            >
              {url}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={copyUrl}
              className="px-5 font-semibold"
              style={{ background: 'hsl(43 70% 42%)', color: 'hsl(220 25% 8%)', border: 'none' }}
            >
              Copy URL
            </Button>
            <Button
              onClick={openInBbo}
              className="px-5 font-semibold"
              style={{ background: 'hsl(150 50% 30%)', color: '#fff', border: 'none' }}
            >
              Open in BBO ↗
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
