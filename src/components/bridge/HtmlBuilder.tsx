import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BridgeBoard } from '@/types/bridge';
import { buildHtml, HtmlExportOptions } from '@/utils/buildHtml';
import { toast } from 'sonner';

interface HtmlBuilderProps {
  board: BridgeBoard;
  playCards: Map<string, number>;
}

const sectionLabel: React.CSSProperties = {
  color: 'hsl(43 70% 55%)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '8px',
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'hsl(43 60% 30%)' : 'hsl(220 18% 15%)',
  border: active ? '1.5px solid hsl(43 60% 45%)' : '1px solid hsl(220 18% 24%)',
  color: active ? 'hsl(43 90% 75%)' : 'hsl(210 20% 70%)',
  borderRadius: '8px',
  padding: '6px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all 0.12s',
});

const radioStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'hsl(220 18% 20%)' : 'hsl(220 18% 15%)',
  border: active ? '1.5px solid hsl(43 60% 40%)' : '1px solid hsl(220 18% 24%)',
  borderRadius: '8px',
  padding: '7px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  fontSize: '13px',
  color: 'hsl(210 20% 80%)',
  transition: 'all 0.12s',
});

const SUIT_SYMBOLS: { key: string; symbol: string; red: boolean }[] = [
  { key: 's', symbol: '♠', red: false },
  { key: 'h', symbol: '♥', red: true },
  { key: 'd', symbol: '♦', red: true },
  { key: 'c', symbol: '♣', red: false },
];

export const HtmlBuilder: React.FC<HtmlBuilderProps> = ({ board, playCards }) => {
  const [open, setOpen] = useState(false);

  const [north, setNorth] = useState(true);
  const [east, setEast] = useState(true);
  const [south, setSouth] = useState(true);
  const [west, setWest] = useState(true);

  const [auction, setAuction] = useState<HtmlExportOptions['auction']>('with-headers');
  const [played, setPlayed] = useState(0);
  const [playedStyle, setPlayedStyle] = useState<HtmlExportOptions['playedStyle']>('grey');
  const [showOnFelt, setShowOnFelt] = useState(true);
  const [excludeSuits, setExcludeSuits] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');

  const maxPlayed = playCards.size;

  const opts: HtmlExportOptions = {
    north, east, south, west,
    auction,
    played,
    playedStyle,
    showOnFelt,
    excludeSuits,
    title,
  };

  const html = useMemo(() => {
    try {
      return buildHtml(board, playCards, opts);
    } catch {
      return '<html><body><p style="color:red">Error generating HTML</p></body></html>';
    }
  }, [board, playCards, north, east, south, west, auction, played, playedStyle, showOnFelt, excludeSuits, title]);

  const toggleSuit = (key: string) => {
    setExcludeSuits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board${board['Board number']}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('HTML file downloaded!');
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(html)
      .then(() => toast('HTML copied to clipboard!'))
      .catch(() => toast('Failed to copy HTML'));
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
          Generate HTML
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-4xl"
        style={{ background: 'hsl(220 22% 11%)', border: '1px solid hsl(220 18% 24%)', color: 'hsl(210 20% 88%)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'hsl(43 80% 60%)', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>
            Generate HTML
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mt-1 overflow-hidden" style={{ maxHeight: '82vh' }}>

          {/* Left: options panel */}
          <div className="flex flex-col gap-5 overflow-y-auto pr-2" style={{ minWidth: '300px', maxWidth: '300px' }}>

            {/* Title */}
            <div>
              <div style={sectionLabel}>Title</div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Optional title..."
                style={{
                  width: '100%',
                  background: 'hsl(220 18% 16%)',
                  border: '1px solid hsl(220 18% 28%)',
                  color: 'hsl(210 20% 85%)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Hands */}
            <div>
              <div style={sectionLabel}>Hands to include</div>
              <div className="flex gap-2 flex-wrap">
                {([['north', north, setNorth, 'N'], ['east', east, setEast, 'E'], ['south', south, setSouth, 'S'], ['west', west, setWest, 'W']] as [string, boolean, (v: boolean) => void, string][]).map(([id, val, setter, letter]) => (
                  <label key={id} style={pillStyle(val)}>
                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className="accent-amber-500 hidden" />
                    {letter}
                  </label>
                ))}
              </div>
              <div className="mt-1.5 text-xs" style={{ color: 'hsl(215 15% 45%)' }}>
                {[north, east, south, west].filter(Boolean).length === 1
                  ? 'Single-hand inline layout'
                  : [north, east, south, west].filter(Boolean).length === 0
                    ? 'No hands — auction only'
                    : 'Four-hand diagram'}
              </div>
            </div>

            {/* Auction */}
            <div>
              <div style={sectionLabel}>Auction</div>
              <div className="flex flex-col gap-1.5">
                {([['none', 'None'], ['with-headers', 'With direction headers'], ['no-header', 'Players only']] as [HtmlExportOptions['auction'], string][]).map(([val, label]) => (
                  <label key={val} style={radioStyle(auction === val)}>
                    <input type="radio" name="auction" value={val} checked={auction === val} onChange={() => setAuction(val)} className="accent-amber-500" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Played cards */}
            {maxPlayed > 0 && (
              <div>
                <div style={sectionLabel}>Played cards</div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="range"
                    min={0}
                    max={maxPlayed}
                    value={played}
                    onChange={e => setPlayed(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={maxPlayed}
                    value={played}
                    onChange={e => setPlayed(Math.max(0, Math.min(maxPlayed, Number(e.target.value))))}
                    style={{
                      width: '52px',
                      background: 'hsl(220 18% 16%)',
                      border: '1px solid hsl(220 18% 28%)',
                      color: 'hsl(210 20% 85%)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '13px',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </div>

                {played > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs mb-1" style={{ color: 'hsl(215 15% 50%)' }}>Display played cards as:</div>
                    <div className="flex gap-2 flex-wrap">
                      {([['remove', 'Remove'], ['grey', 'Greyed'], ['white', 'Invisible']] as [HtmlExportOptions['playedStyle'], string][]).map(([val, label]) => (
                        <label key={val} style={radioStyle(playedStyle === val)}>
                          <input type="radio" name="playedStyle" value={val} checked={playedStyle === val} onChange={() => setPlayedStyle(val)} className="accent-amber-500" />
                          {label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm mt-1 cursor-pointer" style={{ color: 'hsl(210 20% 78%)' }}>
                      <input
                        type="checkbox"
                        checked={showOnFelt}
                        onChange={e => setShowOnFelt(e.target.checked)}
                        className="accent-amber-500"
                      />
                      Show current trick on felt
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Suits to exclude */}
            <div>
              <div style={sectionLabel}>Exclude suits</div>
              <div className="flex gap-2">
                {SUIT_SYMBOLS.map(({ key, symbol, red }) => {
                  const excluded = excludeSuits.has(key);
                  return (
                    <label
                      key={key}
                      style={{
                        ...pillStyle(excluded),
                        color: excluded
                          ? 'hsl(43 90% 75%)'
                          : red ? 'hsl(0 75% 65%)' : 'hsl(210 20% 80%)',
                        border: excluded ? '1.5px solid hsl(43 60% 45%)' : '1px solid hsl(220 18% 30%)',
                        background: excluded ? 'hsl(43 60% 30%)' : 'hsl(220 18% 16%)',
                        opacity: excluded ? 0.6 : 1,
                      }}
                    >
                      <input type="checkbox" checked={excluded} onChange={() => toggleSuit(key)} className="hidden" />
                      {symbol}
                    </label>
                  );
                })}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'hsl(215 15% 45%)' }}>
                {excludeSuits.size > 0 ? `Hiding: ${[...excludeSuits].map(k => SUIT_SYMBOLS.find(s => s.key === k)?.symbol).join(' ')}` : 'All suits shown'}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={downloadHtml}
                className="flex-1 font-semibold text-sm"
                style={{ background: 'hsl(43 70% 42%)', color: 'hsl(220 25% 8%)', border: 'none' }}
              >
                Download
              </Button>
              <Button
                onClick={copyHtml}
                variant="outline"
                className="flex-1 font-semibold text-sm"
                style={{ background: 'hsl(220 18% 18%)', border: '1px solid hsl(220 18% 30%)', color: 'hsl(210 20% 75%)' }}
              >
                Copy HTML
              </Button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="flex flex-col flex-1 min-w-0">
            <div style={sectionLabel}>Live Preview</div>
            <div
              className="rounded-lg overflow-hidden flex-1"
              style={{ border: '1px solid hsl(220 18% 24%)', background: '#fff', minHeight: '400px' }}
            >
              <iframe
                srcDoc={html}
                width="100%"
                height="100%"
                style={{ display: 'block', border: 'none', minHeight: '400px' }}
                title="HTML Preview"
              />
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
