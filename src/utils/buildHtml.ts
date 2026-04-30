import { BridgeBoard, Direction, Hand } from '@/types/bridge';

export interface HtmlExportOptions {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
  vertical: boolean;
  auction: 'none' | 'with-headers' | 'no-header';
  played: number;
  playedStyle: 'grey' | 'white';
  showOnFelt: boolean;
  excludeSuits: Set<string>;
}

const AUCTION_DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];
const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'] as const;
const SUIT_LETTER: Record<string, string> = { Spades: 'S', Hearts: 'H', Diamonds: 'D', Clubs: 'C' };

const PIPS: Record<string, string> = {
  S: '&#9824;',
  H: '<span style="color:rgb(192,22,22);">&#9829;</span>',
  D: '<span style="color:rgb(192,22,22);">&#9830;</span>',
  C: '&#9827;',
};

const CSS = `<style>
    body { color: #000000; background: #ffffff; color-scheme: light; }
    .bridge-diagram {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Color Emoji", "Segoe UI Emoji";
      --col-center: 145px;
      --felt-w:    120px;
    }
    .bridge-diagram table { border-collapse: collapse; margin: 0 auto; table-layout: auto; }
    .bridge-diagram td { vertical-align: top; padding: 0 .5rem; width: auto; }
    .bridge-diagram .col-center { width: var(--col-center); }
    .bridge-diagram .center-hand { text-align: left; padding-left: 30px; }
    .bridge-diagram tbody tr:nth-child(2) td { vertical-align: middle; }
    .bridge-diagram .table-cell { text-align:center; }
    .bridge-diagram .felt {
      position: relative; width: var(--felt-w); height: 80px; margin: 8px auto; background: #215b33; border-radius: 12px;
      box-shadow: inset 0 0 0 3px #134022, inset 0 0 30px rgba(0,0,0,.35);
    }
    .bridge-diagram .card {
      position: absolute; background: #fff; border-radius: 6px; border: 1px solid #d9d9d9; padding: 2px 6px;
      font-size: 14px; font-weight: 700; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,.18);
    }
    .bridge-diagram .north { top: 4px; left: 50%; transform: translateX(-50%); }
    .bridge-diagram .south { bottom: 4px; left: 50%; transform: translateX(-50%); }
    .bridge-diagram .west  { left: 4px; top: 50%; transform: translateY(-50%); }
    .bridge-diagram .east  { right: 4px; top: 50%; transform: translateY(-50%); }
    .bridge-diagram .hand-title { font-weight: 700; }
    .bridge-diagram .name { font-style: italic; }
    .bridge-diagram .hand { white-space: nowrap; }
    .bridge-diagram .hand-west {
      text-align: left;
      white-space: nowrap;
      padding-right: .2rem;
    }
    .bridge-diagram .hand-east { text-align:left; }
</style>
`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRank(r: string): string {
  return r === 'T' ? '10' : r;
}

function formatHand(
  hand: Hand,
  opts: HtmlExportOptions,
  playedSet: Set<string>,
  withBreaks = true,
  indent = 0,
): string {
  const br = withBreaks ? '<br />\n' : '&nbsp;&nbsp;';
  const sp = ' '.repeat(indent);
  const lines: string[] = [];

  for (const suit of SUITS) {
    const sl = SUIT_LETTER[suit].toLowerCase();
    if (opts.excludeSuits.has(sl)) continue;

    const pip = PIPS[SUIT_LETTER[suit]];
    const cards = hand[suit];
    const display: string[] = [];
    const whiteDisplay: string[] = [];

    for (const card of cards) {
      const cardId = `${SUIT_LETTER[suit]}${card}`;
      const played = playedSet.has(cardId);
      const rankStr = formatRank(card);

      if (played) {
        if (opts.playedStyle === 'white') {
          whiteDisplay.push(`<span style="color:#fff;">${rankStr}</span>`);
        } else {
          display.push(`<span style="color:#aaa;">${rankStr}</span>`);
        }
      } else {
        display.push(rankStr);
      }
    }

    const full = [...display, ...whiteDisplay];
    const line = full.length > 0
      ? `${sp}${pip} ${full.join(' ')}`
      : `${sp}${pip} --`;
    lines.push(line);
  }

  return lines.join(br) + br;
}

function formatHandDiagram(
  seat: { Direction: Direction; Player?: string; Hand: Hand },
  opts: HtmlExportOptions,
  playedSet: Set<string>,
): string {
  let html = `          <div class="hand-title">${seat.Direction.toUpperCase()}</div>\n`;
  if (seat.Player) {
    html += `          <div class="name">${escapeHtml(seat.Player)}</div>\n`;
  }
  html += formatHand(seat.Hand, opts, playedSet, true, 10);
  return html;
}

function formatCall(call: string): string {
  let c = call;
  for (const [s, pip] of Object.entries(PIPS)) {
    if (c.length > 1) {
      c = c.split(s).join(' ' + pip);
    }
  }
  return c
    .replace(/P/g, 'Pass')
    .replace(/D/g, 'Double')
    .replace(/R/g, 'Redouble')
    .replace(/N/g, ' NT');
}

function formatAuctionCalls(auction: string[], dealer: Direction): string[] {
  let callList = auction.map(formatCall);

  if (callList.length > 3) {
    const last3 = callList.slice(-3);
    if (last3.every(c => c === 'Pass')) {
      callList = [...callList.slice(0, -3), '(All pass)'];
    }
    if (callList[callList.length - 1] === 'Pass') {
      callList.pop();
    }
  }

  const dealerIndex = AUCTION_DIRECTIONS.indexOf(dealer);
  const offset = dealerIndex >= 0 ? dealerIndex : 0;
  return [...Array(offset).fill('\u00a0'), ...callList];
}

function formatAuctionRows(calls: string[]): string {
  const padded = [...calls];
  while (padded.length % 4 !== 0) padded.push('\u00a0');

  let html = '';
  for (let i = 0; i < padded.length; i++) {
    if (i % 4 === 0) html += '    <tr>\n';
    html += `      <td align="left" width="25%">${padded[i]}</td>\n`;
    if (i % 4 === 3) html += '    </tr>\n';
  }
  return html;
}

function buildAuctionTable(board: BridgeBoard, includeDirections: boolean): string {
  const players = Object.fromEntries(board.Seats.map(s => [s.Direction, s.Player ?? '']));

  let header = '';
  if (includeDirections) {
    header += '    <tr>\n';
    for (const dir of AUCTION_DIRECTIONS) {
      header += `      <td align="left" width="25%"><b>${dir}</b></td>\n`;
    }
    header += '    </tr>\n';
  }

  header += '    <tr>\n';
  for (const dir of AUCTION_DIRECTIONS) {
    header += `      <td align="left" width="25%"><i>${escapeHtml(players[dir] ?? '')}</i></td>\n`;
  }
  header += '    </tr>';

  const auctionRows = formatAuctionRows(formatAuctionCalls(board.Auction, board.Dealer));

  return `<br/>
<table align="center" border="0" cellpadding="0" cellspacing="0" style="width:350px;padding-left:30px">
  <tbody>
${header}
${auctionRows}  </tbody>
</table>\n`;
}

function buildCardTable(
  cardToSeat: Map<string, string>,
  opts: HtmlExportOptions,
  playSequence: string[],
): string {
  const emptyFelt = `        <td class="table-cell">
          <div class="felt">
          </div>
        </td>\n`;

  if (opts.played === 0 || !opts.showOnFelt) return emptyFelt;

  const numToShow = ((opts.played - 1) % 4) + 1;
  const cardsToShow = playSequence.slice(0, opts.played).slice(-numToShow);

  if (cardsToShow.length === 0) return emptyFelt;

  let html = `        <td class="table-cell">
          <div class="felt">\n`;

  for (const card of cardsToShow) {
    const direction = cardToSeat.get(card) ?? '';
    const suitLetter = card[0];
    let rankStr = card.slice(1);
    if (rankStr === 'T') rankStr = '10';
    const pip = PIPS[suitLetter] ?? suitLetter;
    html += `            <div class="card ${direction}">${pip} ${rankStr}</div>\n`;
  }

  html += `          </div>
        </td>\n`;
  return html;
}

function buildDiagram(
  board: BridgeBoard,
  opts: HtmlExportOptions,
  playedSet: Set<string>,
  playSequence: string[],
): string {
  const cardToSeat = new Map<string, string>();
  for (const seat of board.Seats) {
    const dir = seat.Direction.toLowerCase();
    for (const suit of SUITS) {
      for (const card of seat.Hand[suit]) {
        cardToSeat.set(`${SUIT_LETTER[suit]}${card}`, dir);
      }
    }
  }

  const seatMap = Object.fromEntries(board.Seats.map(s => [s.Direction, s]));
  const handHtml: Record<string, string> = {};
  for (const dir of ['North', 'East', 'South', 'West'] as Direction[]) {
    const seat = seatMap[dir];
    handHtml[dir] = seat ? formatHandDiagram(seat, opts, playedSet) : '';
  }

  let table = `<div align="center" class="bridge-diagram">
  <table>
    <colgroup>
      <col class="col-left" />
      <col class="col-center" />
      <col class="col-right" />
    </colgroup>
    <tbody>\n`;

  if (opts.north) {
    table += `      <tr>
        <td></td>
        <td class="hand center-hand">
${handHtml['North']}
        </td>
        <td></td>
      </tr>\n`;
  }

  table += `      <tr>
        <td class="hand hand-west">
${opts.west ? handHtml['West'] : ''} 
        </td>\n`;
  table += buildCardTable(cardToSeat, opts, playSequence);
  table += `        <td class="hand hand-east">
${opts.east ? handHtml['East'] : ''}
        </td>
      </tr>\n`;

  if (opts.south) {
    table += `      <tr>
        <td></td>
        <td class="hand center-hand">
${handHtml['South']}
        </td>
        <td></td>
      </tr>\n`;
  }

  table += `    </tbody>
  </table>
</div>\n`;
  return table;
}

function buildSingleHand(hand: Hand, opts: HtmlExportOptions, playedSet: Set<string>): string {
  if (opts.vertical) {
    const handHtml = formatHand(hand, opts, playedSet, true, 0);
    return `<div align="center" class="bridge-diagram">
  <table>
    <colgroup>
      <col class="col-left" />
      <col class="col-center" />
      <col class="col-right" />
    </colgroup>
    <tbody>
      <tr>
        <td></td>
        <td class="hand center-hand">
${handHtml}
        </td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>\n`;
  }
  const handHtml = formatHand(hand, opts, playedSet, false);
  return `<TABLE width="300" border="0" cellspacing="0" cellpadding="0" align="center"><TR><TD WIDTH="100%" Align="center">${handHtml}</TD></TR></TABLE>\n`;
}

export function buildHtmlSeries(
  board: BridgeBoard,
  playCards: Map<string, number>,
  opts: HtmlExportOptions,
): { filename: string; html: string }[] {
  const total = playCards.size;
  const padLen = Math.max(2, String(total).length);
  const results: { filename: string; html: string }[] = [];
  for (let n = 0; n <= total; n++) {
    const suffix = String(n).padStart(padLen, '0');
    results.push({ filename: `-${suffix}.html`, html: buildHtml(board, playCards, { ...opts, played: n }) });
  }
  return results;
}

export function buildHtml(
  board: BridgeBoard,
  playCards: Map<string, number>,
  opts: HtmlExportOptions,
): string {
  const playSequence = Array.from(playCards.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([card]) => card);

  const playedSet = new Set(playSequence.slice(0, opts.played));

  let body = CSS;

  const seatsToShow = [
    opts.north ? 'N' : '',
    opts.east ? 'E' : '',
    opts.south ? 'S' : '',
    opts.west ? 'W' : '',
  ].filter(Boolean).join('');

  const dirMap: Record<string, Direction> = { N: 'North', E: 'East', S: 'South', W: 'West' };

  if (seatsToShow.length === 0) {
    // no hands selected — omit diagram and felt entirely
  } else if (seatsToShow.length >= 4) {
    const allFourOpts = { ...opts, north: true, east: true, south: true, west: true };
    body += buildDiagram(board, allFourOpts, playedSet, playSequence);
  } else if (seatsToShow.length === 1) {
    const dir = dirMap[seatsToShow];
    const seat = board.Seats.find(s => s.Direction === dir);
    if (seat) {
      body += buildSingleHand(seat.Hand, opts, playedSet);
    }
  } else {
    body += buildDiagram(board, opts, playedSet, playSequence);
  }

  if (opts.auction === 'with-headers') {
    body += buildAuctionTable(board, true);
  } else if (opts.auction === 'no-header') {
    body += buildAuctionTable(board, false);
  }

  return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${body}</body>\n</html>`;
}
