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
  if (upper === 'X')    return 'D';   // Double
  if (upper === 'XX')   return 'R';   // Redouble
  if (/^[1-7][CDHS]$/.test(upper)) return upper;
  if (/^[1-7]NT$/.test(upper)) return upper[0] + 'N'; // "3NT" → "3N"
  return null;
}

function extractFirstDeal(content: string): string {
  // Each game record starts with [Event. Find the second occurrence and clip there.
  // We intentionally do NOT split on [Board because [Board appears inside every game.
  const eventRegex = /^\[Event\b/gm;
  eventRegex.exec(content); // first deal's [Event] — skip it
  const secondDeal = eventRegex.exec(content);
  if (secondDeal) return content.slice(0, secondDeal.index);
  // No [Event tags (or only one) — return entire content
  return content;
}

function cleanPlayerName(raw: string): string {
  // Strip RealBridge-style "#number" suffix: "Diana Styche#22803" → "Diana Styche"
  return raw.replace(/#\d+$/, '').trim();
}

function stripComments(text: string): string {
  // Remove { ... } comment blocks (may span lines)
  return text.replace(/\{[^}]*\}/g, ' ');
}

export function parsePbn(rawContent: string): BridgeBoard {
  const content = extractFirstDeal(rawContent);

  // Extract all [Tag "value"] pairs from the first deal
  const tags: Record<string, string> = {};
  const tagRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(content)) !== null) {
    const [, name, value] = m;
    if (!(name in tags)) tags[name] = value; // first occurrence wins
  }

  // Board number
  const boardNumber = parseInt(tags['Board'] ?? '1', 10) || 1;

  // Dealer
  const dealerLetter = (tags['Dealer'] ?? 'N').trim().toUpperCase();
  const dealer: Direction = SEAT_LETTER[dealerLetter] ?? 'North';

  // Player names (optional); strip platform-specific suffixes like "#22803"
  const playerNames: Partial<Record<Direction, string>> = {
    North: tags['North'] ? cleanPlayerName(tags['North']) : undefined,
    East:  tags['East']  ? cleanPlayerName(tags['East'])  : undefined,
    South: tags['South'] ? cleanPlayerName(tags['South']) : undefined,
    West:  tags['West']  ? cleanPlayerName(tags['West'])  : undefined,
  };

  // Deal: "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85"
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

  // Play: find [Play "X"] tag, then collect card tokens until * or next [tag]
  // PBN card format (e.g. HT, SA, DK) is identical to the internal card key format.
  const playTagRx = /\[Play\s+"[NESW]"\]/i;
  const playTagMatch = playTagRx.exec(content);
  const play: string[] = [];

  if (playTagMatch) {
    const afterPlay = content.slice(playTagMatch.index + playTagMatch[0].length);
    const nextTagMatch = /^\[/m.exec(afterPlay);
    const playSection = nextTagMatch ? afterPlay.slice(0, nextTagMatch.index) : afterPlay;
    const cleaned = stripComments(playSection);
    const tokens = cleaned.trim().split(/\s+/);
    for (const token of tokens) {
      if (!token) continue;
      if (token === '*') break;          // incomplete play marker
      if (token === '-') continue;       // seat had no card in this trick
      if (/^[SHDC][A-Z0-9]$/.test(token)) play.push(token);
    }
  }

  // Auction: find [Auction "X"] tag, then read tokens until next [...] tag line
  const auctionTagRx = /\[Auction\s+"[NESW]"\]/i;
  const auctionTagMatch = auctionTagRx.exec(content);
  const auction: string[] = [];

  if (auctionTagMatch) {
    const afterAuction = content.slice(auctionTagMatch.index + auctionTagMatch[0].length);
    // Stop at the next [...] tag (start of next section)
    const nextTagMatch = /^\[/m.exec(afterAuction);
    const auctionSection = nextTagMatch
      ? afterAuction.slice(0, nextTagMatch.index)
      : afterAuction;

    const cleaned = stripComments(auctionSection);
    const tokens = cleaned.trim().split(/\s+/);

    for (const token of tokens) {
      if (!token || token === '*' || token === '-') break; // end markers
      // Skip annotation glyphs: =N=, $N, !, ?, !!, etc.
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
