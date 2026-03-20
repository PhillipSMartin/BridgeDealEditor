import { BridgeBoard, Direction, Hand } from '@/types/bridge';

const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];
const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANK_ORDER = 'AKQJT98765432';
const FULL_DECK = new Set(
  SUITS.flatMap(suit => [...RANK_ORDER].map(rank => `${suit}${rank}`))
);

function extractLin(url: string): string {
  const parsed = new URL(url);
  const lin = parsed.searchParams.get('lin');
  if (!lin) throw new Error('No lin parameter found in URL');
  return decodeURIComponent(lin);
}

function normalizeRanks(ranks: string): string {
  const uniqueRanks = new Set<string>();

  for (const rank of ranks) {
    if (!RANK_ORDER.includes(rank)) {
      throw new Error(`Invalid rank character: ${rank}`);
    }
    if (uniqueRanks.has(rank)) {
      throw new Error(`Duplicate rank in suit: ${rank}`);
    }
    uniqueRanks.add(rank);
  }

  return [...RANK_ORDER].filter(rank => uniqueRanks.has(rank)).join('');
}

function splitSuits(hand: string): string[] {
  const segments = hand.match(/[SHDC][^SHDC]*/g);
  if (!segments) {
    return ['', '', '', ''];
  }

  const suitMap: Record<(typeof SUITS)[number], string> = {
    S: '',
    H: '',
    D: '',
    C: '',
  };

  for (const segment of segments) {
    const suit = segment[0] as (typeof SUITS)[number];
    const ranks = segment.slice(1);
    suitMap[suit] = normalizeRanks(ranks);
  }

  return [suitMap.S, suitMap.H, suitMap.D, suitMap.C];
}

function buildHand(suits: string[]): Hand {
  return {
    Spades: suits[0] || '',
    Hearts: suits[1] || '',
    Diamonds: suits[2] || '',
    Clubs: suits[3] || '',
  };
}

function extractBoardNumber(lin: string): number {
  const match = lin.match(/(?:^|\|)ah\|Board\s+(\d+)\|/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

function extractDealer(mdValue: string): number {
  return (parseInt(mdValue[0], 10) - 2 + 4) % 4;
}

function parseHandString(hand: string): Hand {
  return buildHand(splitSuits(hand));
}

function handToCards(hand: Hand): string[] {
  return [
    ...[...hand.Spades].map(rank => `S${rank}`),
    ...[...hand.Hearts].map(rank => `H${rank}`),
    ...[...hand.Diamonds].map(rank => `D${rank}`),
    ...[...hand.Clubs].map(rank => `C${rank}`),
  ];
}

function cardsToHand(cards: string[]): Hand {
  const grouped: Record<(typeof SUITS)[number], string> = {
    S: '',
    H: '',
    D: '',
    C: '',
  };

  for (const card of cards) {
    const suit = card[0] as (typeof SUITS)[number];
    const rank = card[1];
    grouped[suit] += rank;
  }

  return buildHand([
    normalizeRanks(grouped.S),
    normalizeRanks(grouped.H),
    normalizeRanks(grouped.D),
    normalizeRanks(grouped.C),
  ]);
}

function extractHands(lin: string): { mdValue: string; parsedHands: Hand[] } {
  const match = lin.match(/(?:^|\|)md\|([^|]*)\|/);
  if (!match) throw new Error('No hands found in LIN');

  const mdValue = match[1];
  if (mdValue.length < 2) throw new Error('Invalid md field');

  const handSlots = mdValue.slice(1).split(',');
  if (handSlots.length !== 4) throw new Error('md must contain 4 hand slots');

  const parsedHands: Array<Hand | null> = [null, null, null, null];
  const usedCards = new Set<string>();
  let missingIndex = -1;

  for (let i = 0; i < handSlots.length; i += 1) {
    const slot = handSlots[i];
    if (!slot) {
      if (missingIndex !== -1) {
        throw new Error('More than one missing hand in md field');
      }
      missingIndex = i;
      continue;
    }

    const parsedHand = parseHandString(slot);
    const cards = handToCards(parsedHand);

    for (const card of cards) {
      if (usedCards.has(card)) {
        throw new Error(`Duplicate card found: ${card}`);
      }
      usedCards.add(card);
    }

    parsedHands[i] = parsedHand;
  }

  if (missingIndex !== -1) {
    const missingCards = [...FULL_DECK].filter(card => !usedCards.has(card));
    if (missingCards.length !== 13) {
      throw new Error('Missing hand cannot be reconstructed to 13 cards');
    }
    parsedHands[missingIndex] = cardsToHand(missingCards);
  }

  const finalHands = parsedHands.map(hand => {
    if (!hand) throw new Error('Failed to build all four hands');
    if (handToCards(hand).length !== 13) {
      throw new Error('Each hand must contain 13 cards');
    }
    return hand;
  });

  return { mdValue, parsedHands: finalHands };
}

function extractPlayers(lin: string): string[] {
  const match = lin.match(/(?:^|\|)pn\|(.*?)\|/);
  if (!match) throw new Error('No players found in LIN');
  const players = match[1].split(',');
  return players.map(p => (p.startsWith('~') ? 'Robot' : p));
}

function extractAuction(lin: string): string[] {
  const auction = [...lin.matchAll(/(?:^|\|)mb\|([^|]+)\|/g)].map(m => m[1]);
  if (auction.length === 0) throw new Error('No auction found in LIN');
  return auction;
}

export class LinParser {
  static parseLinFromUrl(url: string): BridgeBoard | null {
    try {
      const lin = extractLin(url);

      const boardNumber = extractBoardNumber(lin);
      const { mdValue, parsedHands } = extractHands(lin);
      const dealer = extractDealer(mdValue);
      const players = extractPlayers(lin);
      const auction = extractAuction(lin);
      const playCards = [...lin.matchAll(/(?:^|\|)pc\|([^|]+)\|/g)].map(m => m[1]);

      const southIndex = DIRECTIONS.indexOf('South');
      const directionsSouthFirst: Direction[] = [
        ...DIRECTIONS.slice(southIndex),
        ...DIRECTIONS.slice(0, southIndex),
      ];

      const seats = directionsSouthFirst.map((direction, i) => ({
        Player: players[i] || '',
        Direction: direction,
        Hand: parsedHands[i],
      }));

      return {
        'Board number': boardNumber,
        Dealer: DIRECTIONS[dealer],
        Auction: auction,
        Seats: seats,
        Play: playCards,
      };
    } catch (error) {
      console.error('Error parsing BBO URL:', error);
      return null;
    }
  }
}
