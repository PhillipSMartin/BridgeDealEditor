import { BridgeBoard, Direction, Hand, Seat } from '@/types/bridge';

const SEAT_ORDER: Direction[] = ['North', 'East', 'South', 'West'];

const SEAT_LETTER: Record<string, Direction> = {
  N: 'North', E: 'East', S: 'South', W: 'West',
};

const RANK_ORDER = 'AKQJT98765432';

function sortRanks(ranks: string): string {
  return [...ranks].sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b)).join('');
}

function parseHand(handStr: string): Hand {
  const suits = handStr.split('.');
  return {
    Spades:   sortRanks(suits[0] ?? ''),
    Hearts:   sortRanks(suits[1] ?? ''),
    Diamonds: sortRanks(suits[2] ?? ''),
    Clubs:    sortRanks(suits[3] ?? ''),
  };
}

function pbnCallToInternal(token: string): string | null {
  const upper = token.toUpperCase();
  if (upper === 'PASS') return 'P';
  if (upper === 'X')    return 'D';
  if (upper === 'XX')   return 'R';
  if (/^[1-7][CDHS]$/.test(upper)) return upper;
  if (/^[1-7]NT$/.test(upper)) return upper[0] + 'N';
  return null;
}

function extractFirstDeal(content: string): string {
  const eventRegex = /^\[Event\b/gm;
  eventRegex.exec(content);
  const secondDeal = eventRegex.exec(content);
  if (secondDeal) return content.slice(0, secondDeal.index);
  return content;
}

function cleanPlayerName(raw: string): string {
  return raw.replace(/#\d+$/, '').trim();
}

function stripComments(text: string): string {
  return text.replace(/\{[^}]*\}/g, ' ');
}

// Returns 'S'|'H'|'D'|'C' for a suited contract, 'N' for notrump.
function parseTrump(contract: string): string {
  const match = /^[1-7](NT|[SHDC])/i.exec(contract.trim());
  if (!match) return 'N';
  return match[1].toUpperCase() === 'NT' ? 'N' : match[1].toUpperCase();
}

// Given a complete trick (in play order, leader first), return the winning seat.
function trickWinner(
  trick: { seat: Direction; card: string }[],
  trump: string,
): Direction {
  const leadSuit = trick[0].card[0];
  let winnerIdx = 0;
  for (let i = 1; i < trick.length; i++) {
    const { card } = trick[i];
    const suit = card[0];
    const rank = card[1];
    const wCard = trick[winnerIdx].card;
    const wSuit = wCard[0];
    const wRank = wCard[1];
    if (trump !== 'N' && suit === trump) {
      // This card is trump
      if (wSuit !== trump || RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(wRank)) {
        winnerIdx = i;
      }
    } else if (suit === leadSuit && wSuit !== trump) {
      // Same suit as lead, no trump yet played
      if (RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(wRank)) {
        winnerIdx = i;
      }
    }
  }
  return trick[winnerIdx].seat;
}

export function parsePbn(rawContent: string): BridgeBoard {
  const content = extractFirstDeal(rawContent);

  const tags: Record<string, string> = {};
  const tagRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(content)) !== null) {
    const [, name, value] = m;
    if (!(name in tags)) tags[name] = value;
  }

  const boardNumber = parseInt(tags['Board'] ?? '1', 10) || 1;

  const dealerLetter = (tags['Dealer'] ?? tags['Auction'] ?? 'N').trim().toUpperCase()[0];
  const dealer: Direction = SEAT_LETTER[dealerLetter] ?? 'North';

  const playerNames: Partial<Record<Direction, string>> = {
    North: tags['North'] ? cleanPlayerName(tags['North']) : undefined,
    East:  tags['East']  ? cleanPlayerName(tags['East'])  : undefined,
    South: tags['South'] ? cleanPlayerName(tags['South']) : undefined,
    West:  tags['West']  ? cleanPlayerName(tags['West'])  : undefined,
  };

  const dealTag = tags['Deal'] ?? '';
  const colonIdx = dealTag.indexOf(':');
  const startLetter = dealTag[0]?.toUpperCase() ?? 'N';
  const startDir = SEAT_LETTER[startLetter] ?? 'North';
  const startIndex = SEAT_ORDER.indexOf(startDir);
  const handsStr = colonIdx >= 0 ? dealTag.slice(colonIdx + 1).trim() : dealTag;
  const handParts = handsStr.split(/\s+/);

  const seats: Seat[] = [];
  for (let i = 0; i < 4; i++) {
    const direction = SEAT_ORDER[(startIndex + i) % 4];
    const handStr = handParts[i] ?? '...';
    const hand = parseHand(handStr);
    const seat: Seat = { Direction: direction, Hand: hand };
    const name = playerNames[direction];
    if (name) seat.Player = name;
    seats.push(seat);
  }

  // ── Play section ──────────────────────────────────────────────────────────
  // PBN layout: [Play "X"] means X leads trick 1. Each subsequent row lists
  // the 4 cards played in that trick in FIXED COLUMN ORDER (X, X+1, X+2, X+3
  // clockwise), NOT in play order. To reconstruct play order we must track the
  // trick winner (who leads next), which requires knowing the trump suit.
  const trump = parseTrump(tags['Contract'] ?? '');

  const playTagRx = /\[Play\s+"([NESW])"\]/i;
  const playTagMatch = playTagRx.exec(content);
  const play: string[] = [];

  if (playTagMatch) {
    const playLetter = (playTagMatch[1] ?? 'N').toUpperCase();
    const playStartDir = SEAT_LETTER[playLetter] ?? 'North';
    const playStartIdx = SEAT_ORDER.indexOf(playStartDir);
    // Fixed column order: playStartDir, next clockwise, …
    const columnSeats: Direction[] = [0, 1, 2, 3].map(
      i => SEAT_ORDER[(playStartIdx + i) % 4],
    );

    // Collect flat card tokens (null = '-' placeholder, stop at '*')
    const afterPlay = content.slice(playTagMatch.index + playTagMatch[0].length);
    const nextTagAfterPlay = /^\[/m.exec(afterPlay);
    const playSection = nextTagAfterPlay
      ? afterPlay.slice(0, nextTagAfterPlay.index)
      : afterPlay;
    const cleanedPlay = stripComments(playSection);
    const flatCards: (string | null)[] = [];
    for (const token of cleanedPlay.trim().split(/\s+/)) {
      if (!token) continue;
      if (token === '*') break;
      if (token === '-') { flatCards.push(null); continue; }
      if (/^[SHDC][A-Z0-9]$/.test(token)) flatCards.push(token);
    }

    // Process tricks, reordering each one by actual play sequence
    let leader = playStartDir;
    for (let t = 0; t * 4 + 3 < flatCards.length; t++) {
      const base = t * 4;
      const leaderColIdx = columnSeats.indexOf(leader);

      // Build the trick in actual play order (leader first, then clockwise)
      const trickInOrder: { seat: Direction; card: string }[] = [];
      let hasNull = false;
      for (let i = 0; i < 4; i++) {
        const colIdx = (leaderColIdx + i) % 4;
        const card = flatCards[base + colIdx];
        if (card === null) { hasNull = true; break; }
        trickInOrder.push({ seat: columnSeats[colIdx], card });
      }

      if (hasNull) break; // incomplete trick — stop here

      for (const { card } of trickInOrder) play.push(card);
      leader = trickWinner(trickInOrder, trump);
    }
  }

  // ── Auction section ───────────────────────────────────────────────────────
  const auctionTagRx = /\[Auction\s+"[NESW]"\]/i;
  const auctionTagMatch = auctionTagRx.exec(content);
  const auction: string[] = [];

  if (auctionTagMatch) {
    const afterAuction = content.slice(auctionTagMatch.index + auctionTagMatch[0].length);
    const nextTagMatch = /^\[/m.exec(afterAuction);
    const auctionSection = nextTagMatch
      ? afterAuction.slice(0, nextTagMatch.index)
      : afterAuction;

    const cleaned = stripComments(auctionSection);
    for (const token of cleaned.trim().split(/\s+/)) {
      if (!token || token === '*' || token === '-') break;
      if (/^=\d+=/.test(token)) continue;
      if (/^\$\d+/.test(token)) continue;
      if (/^[!?]+$/.test(token)) continue;
      const internal = pbnCallToInternal(token);
      if (internal !== null) auction.push(internal);
    }
  }

  return {
    'Board number': boardNumber,
    Dealer: dealer,
    Auction: auction,
    Seats: seats,
    Play: play,
  };
}
