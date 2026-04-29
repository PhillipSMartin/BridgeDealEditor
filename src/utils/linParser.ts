import { BridgeBoard, Direction, Hand, Vulnerability } from '@/types/bridge';

const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];
const SUIT_LETTERS = ['S', 'H', 'D', 'C'] as const;
const RANK_ORDER = 'AKQJT98765432';

function splitSuits(hand: string): string[] {
  // input 'S96432HKQ94DT5C73' (possibly with an integer preceding the S)
  // output ['96432', 'KQ94', 'T5', '73']
  return hand.split(/[SHDC]/).slice(1);
}

function sortRanks(ranks: string): string {
  return [...ranks].sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b)).join('');
}

function buildHand(suits: string[]): Hand {
  return {
    Spades: sortRanks(suits[0] || ''),
    Hearts: sortRanks(suits[1] || ''),
    Diamonds: sortRanks(suits[2] || ''),
    Clubs: sortRanks(suits[3] || ''),
  };
}

function handStringToCardSet(handStr: string): Set<string> {
  const suits = splitSuits(handStr);
  const cards = new Set<string>();
  for (let i = 0; i < 4; i++) {
    for (const rank of (suits[i] || '')) {
      cards.add(`${SUIT_LETTERS[i]}${rank}`);
    }
  }
  return cards;
}

function buildHandFromRemainingCards(usedCards: Set<string>): Hand {
  const remaining: Record<string, string> = { S: '', H: '', D: '', C: '' };
  for (const suit of SUIT_LETTERS) {
    for (const rank of RANK_ORDER) {
      if (!usedCards.has(`${suit}${rank}`)) {
        remaining[suit] += rank;
      }
    }
  }
  return {
    Spades: remaining.S,
    Hearts: remaining.H,
    Diamonds: remaining.D,
    Clubs: remaining.C,
  };
}

function extractBoardNumber(url: string): number {
  const match = url.match(/.*?Board(.*?)\|/);
  if (!match) return 0;
  return parseInt(match[1].slice(-2), 10);
}

function extractDealer(hand: string): number {
  // first char of hand is dealer: 1 for South, 2 for West, etc.
  // subtract 2 to make it an index into DIRECTIONS
  return (parseInt(hand[0], 10) - 2 + 4) % 4;
}

function extractHands(url: string): string[] {
  const match = url.match(/.*?\|md\|(.*?)\|/);
  if (!match) throw new Error('No hands found in URL');
  return match[1].split(',');
}

function extractPlayers(url: string): string[] {
  const match = url.match(/.*?[|=]pn\|(.*?)\|/);
  if (!match) return ['', '', '', ''];
  const players = match[1].split(',');
  return players.map(p => {
    if (p.startsWith('~')) return 'Robot';
    return p;
  });
}

// ── Vulnerability ──────────────────────────────────────────────────────────
// Used by both LIN (`sv|X|`) and QP (`v=X`) formats.
const VUL_MAP: Record<string, Vulnerability> = {
  o: 'None', '-': 'None',
  n: 'NS',
  e: 'EW',
  b: 'Both', a: 'Both',
};

function parseVulnerability(raw: string): Vulnerability | undefined {
  return VUL_MAP[raw.toLowerCase()];
}

// ── Query-parameter (QP) format ───────────────────────────────────────────
// e.g. ?n=s32hqt86d8764cj98&s=sakjth2dakq3ckt76&e=...&a=1d1s1nppp&d=s&b=12

const QP_SUIT_MAP: Record<string, string> = { s: 'S', h: 'H', d: 'D', c: 'C', n: 'N' };
const QP_DIR_MAP: Record<string, Direction> = { n: 'North', s: 'South', e: 'East', w: 'West' };

function parseHandQP(handStr: string): Hand {
  return buildHand(splitSuits(handStr.toUpperCase()));
}

function parseAuctionQP(auctionStr: string): string[] {
  const calls: string[] = [];
  const a = auctionStr.toLowerCase();
  let i = 0;
  while (i < a.length) {
    const c = a[i];
    if (c >= '1' && c <= '7') {
      const suit = QP_SUIT_MAP[a[i + 1] ?? ''];
      if (suit) calls.push(`${c}${suit}`);
      i += 2;
    } else if (c === 'p') { calls.push('P'); i++; }
    else if (c === 'd') { calls.push('D'); i++; }
    else if (c === 'x') { calls.push('D'); i++; }
    else if (c === 'r') { calls.push('R'); i++; }
    else { i++; }
  }
  return calls;
}

function parsePlayQP(playStr: string): string[] {
  const cards: string[] = [];
  const p = playStr.toLowerCase();
  for (let i = 0; i + 1 < p.length; i += 2) {
    cards.push((p[i] + p[i + 1]).toUpperCase());
  }
  return cards;
}

function parseQueryParamUrl(decoded: string): BridgeBoard {
  const qmark = decoded.indexOf('?');
  const qs = qmark >= 0 ? decoded.slice(qmark + 1) : decoded;
  const params = new URLSearchParams(qs);

  const boardNumber = parseInt(params.get('b') ?? '0', 10);
  const dealerRaw = (params.get('d') ?? 'n').toLowerCase();
  const dealer: Direction = QP_DIR_MAP[dealerRaw] ?? 'North';

  const directionParams: [Direction, string][] = [
    ['North', params.get('n') ?? ''],
    ['South', params.get('s') ?? ''],
    ['East',  params.get('e') ?? ''],
    ['West',  params.get('w') ?? ''],
  ];

  const seats = directionParams.map(([direction, handStr]) => ({
    Player: '',
    Direction: direction,
    Hand: parseHandQP(handStr),
  }));

  const auction = parseAuctionQP(params.get('a') ?? '');
  const playStr = params.get('p') ?? '';
  const play = playStr ? parsePlayQP(playStr) : [];
  const vulnerability = parseVulnerability(params.get('v') ?? '');

  const board: BridgeBoard = {
    'Board number': boardNumber,
    Dealer: dealer,
    Auction: auction,
    Seats: seats,
    Play: play,
  };
  if (vulnerability !== undefined) board.Vulnerability = vulnerability;
  return board;
}

function extractAuction(url: string): string[] {
  return [...url.matchAll(/mb\|([1-7shdcnrpSHDCNRP]+)[!|]/gi)].map(m => m[1].toUpperCase());
}

export class LinParser {
  static parseLinString(lin: string): BridgeBoard | null {
    return LinParser.parseLinFromUrl(lin);
  }

  static parseLinFromUrl(url: string): BridgeBoard | null {
    try {
      const decoded = decodeURIComponent(url);

      // Detect QP format (?n=...&s=...&e=...&w=...) vs LIN format (|md|...)
      if (!decoded.includes('|md|')) {
        const qmark = decoded.indexOf('?');
        const qs = qmark >= 0 ? decoded.slice(qmark + 1) : decoded;
        const params = new URLSearchParams(qs);
        if (params.has('n') && params.has('s') && params.has('e') && params.has('w')) {
          return parseQueryParamUrl(decoded);
        }
      }

      const boardNumber = extractBoardNumber(decoded);
      const handStrings = extractHands(decoded);
      const dealer = extractDealer(handStrings[0]);
      const players = extractPlayers(decoded);
      const auction = extractAuction(decoded);

      // Extract played cards
      const playCards = [...decoded.matchAll(/pc\|([^|]+)\|/g)].map(m => m[1]);

      // Directions starting from South: South, West, North, East
      const southIndex = DIRECTIONS.indexOf('South');
      const directionsSouthFirst: Direction[] = [
        ...DIRECTIONS.slice(southIndex),
        ...DIRECTIONS.slice(0, southIndex),
      ];

      // Parse the four hand slots; one may be missing (empty or no suit letters).
      // The missing hand is reconstructed from the 13 cards not held by the other three.
      const parsedHands: (Hand | null)[] = [null, null, null, null];
      const usedCards = new Set<string>();
      let missingIndex = -1;

      for (let i = 0; i < 4; i++) {
        const slot = handStrings[i] || '';
        const hasSuits = /[SHDC]/.test(slot);
        if (!hasSuits) {
          if (missingIndex !== -1) throw new Error('More than one hand is missing');
          missingIndex = i;
        } else {
          const hand = buildHand(splitSuits(slot));
          parsedHands[i] = hand;
          for (const card of handStringToCardSet(slot)) {
            usedCards.add(card);
          }
        }
      }

      if (missingIndex !== -1) {
        parsedHands[missingIndex] = buildHandFromRemainingCards(usedCards);
      }

      const seats = directionsSouthFirst.map((direction, i) => ({
        Player: players[i] || '',
        Direction: direction,
        Hand: parsedHands[i] ?? buildHand([]),
      }));

      const svMatch = decoded.match(/sv\|([^|]*)\|/i);
      const vulnerability = svMatch ? parseVulnerability(svMatch[1]) : undefined;

      const board: BridgeBoard = {
        'Board number': boardNumber,
        Dealer: DIRECTIONS[dealer],
        Auction: auction,
        Seats: seats,
        Play: playCards,
      };
      if (vulnerability !== undefined) board.Vulnerability = vulnerability;
      return board;
    } catch (error) {
      console.error('Error parsing BBO URL:', error);
      return null;
    }
  }
}
