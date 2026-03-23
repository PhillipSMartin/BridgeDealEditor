import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BridgeBoard } from '@/types/bridge';
import JSZip from 'jszip';
import { buildHtml, buildHtmlSeries, HtmlExportOptions } from '@/utils/buildHtml';
import { captureHtmlToPng } from '@/utils/captureHtml';
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

  const [fileName, setFileName] = useState(`board${board['Board number']}`);
  const [vertical, setVertical] = useState(false);
  const [perCard, setPerCard] = useState(false);
  const [pngProgress, setPngProgress] = useState<string | null>(null);

  useEffect(() => {
    setFileName(`board${board['Board number']}`);
  }, [board['Board number']]);

  useEffect(() => {
    if (playCards.size === 0) setPerCard(false);
  }, [playCards.size]);

  const [auction, setAuction] = useState<HtmlExportOptions['auction']>('with-headers');
  const [played, setPlayed] = useState(0);
  const [playedStyle, setPlayedStyle] = useState<HtmlExportOptions['playedStyle']>('white');
  const [showOnFelt, setShowOnFelt] = useState(true);
  const [excludeSuits, setExcludeSuits] = useState<Set<string>>(new Set());

  const maxPlayed = playCards.size;
  const handsSelected = [north, east, south, west].filter(Boolean).length;

  const opts: HtmlExportOptions = {
    north, east, south, west,
    vertical,
    auction,
    played,
    playedStyle,
    showOnFelt,
    excludeSuits,
  };

  const html = useMemo(() => {
    try {
      return buildHtml(board, playCards, opts);
    } catch {
      return '<html><body><p style="color:red">Error generating HTML</p></body></html>';
    }
  }, [board, playCards, north, east, south, west, vertical, auction, played, playedStyle, showOnFelt, excludeSuits]);

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
    const name = fileName.trim() || `board${board['Board number']}`;
    a.download = name.endsWith('.html') ? name : `${name}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('HTML file downloaded!');
  };

  const downloadZip = async () => {
    try {
      const rawName = fileName.trim() || `board${board['Board number']}`;
      const name = rawName.replace(/\.(html?|zip)$/i, '');
      const series = buildHtmlSeries(board, playCards, opts);
      const zip = new JSZip();
      for (const { filename, html } of series) {
        zip.file(`${name}${filename}`, html);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`ZIP downloaded (${series.length} files)`);
    } catch {
      toast('Failed to generate ZIP');
    }
  };

  const baseName = () => {
    const raw = fileName.trim() || `board${board['Board number']}`;
    return raw.replace(/\.(html?|zip|png)$/i, '');
  };

  const downloadPng = async () => {
    try {
      setPngProgress('Generating…');
      const name = baseName();
      const blob = await captureHtmlToPng(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast('PNG downloaded!');
    } catch {
      toast('Failed to generate PNG');
    } finally {
      setPngProgress(null);
    }
  };

  const downloadPngZip = async () => {
    try {
      const name = baseName();
      const series = buildHtmlSeries(board, playCards, opts);
      const zip = new JSZip();
      for (let i = 0; i < series.length; i++) {
        setPngProgress(`Generating ${i + 1} of ${series.length}…`);
        const { filename, html: seriesHtml } = series[i];
        const pngBlob = await captureHtmlToPng(seriesHtml);
        zip.file(`${name}${filename.replace(/\.html$/i, '.png')}`, pngBlob);
      }
      setPngProgress('Building ZIP…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`PNG ZIP downloaded (${series.length} files)`);
    } catch {
      toast('Failed to generate PNG ZIP');
    } finally {
      setPngProgress(null);
    }
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
                {handsSelected === 1
                  ? (vertical ? 'Single-hand vertical layout' : 'Single-hand inline layout')
                  : handsSelected >= 2 && handsSelected < 4
                    ? 'Partial diagram'
                    : 'Full four-hand diagram (default when none or all selected)'}
              </div>
              {handsSelected === 1 && (
                <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer" style={{ color: 'hsl(210 20% 78%)' }}>
                  <input
                    type="checkbox"
                    checked={vertical}
                    onChange={e => setVertical(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Vertical layout (one suit per line)
                </label>
              )}
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
                      {([['grey', 'Greyed'], ['white', 'Invisible']] as [HtmlExportOptions['playedStyle'], string][]).map(([val, label]) => (
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

            {/* Per-card ZIP export */}
            <div>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: maxPlayed === 0 ? 'hsl(215 15% 38%)' : 'hsl(210 20% 78%)', userSelect: 'none' }}
              >
                <input
                  type="checkbox"
                  checked={perCard}
                  disabled={maxPlayed === 0}
                  onChange={e => setPerCard(e.target.checked)}
                  className="accent-amber-500"
                />
                One file per played card (downloads as ZIP)
              </label>
              {maxPlayed === 0 && (
                <div className="mt-1 text-xs" style={{ color: 'hsl(215 15% 38%)' }}>Available once cards are played</div>
              )}
            </div>

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

            {/* File name */}
            <div>
              <div style={sectionLabel}>File name</div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder={`board${board['Board number']}`}
                  className="flex-1 rounded px-2 py-1 text-sm"
                  style={{ background: 'hsl(220 18% 15%)', border: '1px solid hsl(220 18% 30%)', color: 'hsl(210 20% 85%)', outline: 'none' }}
                />
                <span className="text-xs" style={{ color: 'hsl(215 15% 45%)' }}>{perCard ? '.zip' : ''}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <Button
                  onClick={perCard ? downloadZip : downloadHtml}
                  disabled={!!pngProgress}
                  className="flex-1 font-semibold text-sm"
                  style={{ background: 'hsl(43 70% 42%)', color: 'hsl(220 25% 8%)', border: 'none' }}
                >
                  {perCard ? 'Download ZIP' : 'Download HTML'}
                </Button>
                <Button
                  onClick={perCard ? downloadPngZip : downloadPng}
                  disabled={!!pngProgress}
                  className="flex-1 font-semibold text-sm"
                  style={{
                    background: pngProgress ? 'hsl(220 18% 22%)' : 'hsl(200 60% 30%)',
                    color: pngProgress ? 'hsl(215 15% 55%)' : 'hsl(200 80% 88%)',
                    border: 'none',
                  }}
                >
                  {pngProgress || (perCard ? 'Download PNG ZIP' : 'Download PNG')}
                </Button>
              </div>
              <Button
                onClick={copyHtml}
                disabled={!!pngProgress}
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
                sandbox=""
              />
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
