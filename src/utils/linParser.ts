import { BridgeBoard, Direction, Hand } from '@/types/bridge';

const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];
const SUIT_LETTERS = ['S', 'H', 'D', 'C'] as const;
const RANK_ORDER = 'AKQJT98765432';

function splitSuits(hand: string): string[] {
  // input 'S96432HKQ94DT5C73' (possibly with an integer preceding the S)
  // output ['96432', 'KQ94', 'T5', '73']
  return hand.split(/[SHDC]/).slice(1);
}

function buildHand(suits: string[]): Hand {
  return {
    Spades: suits[0] || '',
    Hearts: suits[1] || '',
    Diamonds: suits[2] || '',
    Clubs: suits[3] || '',
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
  if (!match) throw new Error('No players found in URL');
  const players = match[1].split(',');
  return players.map(p => {
    if (p.startsWith('~')) return 'Robot';
    return p;
  });
}

function extractAuction(url: string): string[] {
  const auction = [...url.matchAll(/mb\|([1-7SHDCNRP]+)[!|]/g)].map(m => m[1]);
  if (auction.length === 0) throw new Error('No auction found in URL');
  return auction;
}

export class LinParser {
  static parseLinFromUrl(url: string): BridgeBoard | null {
    try {
      const decoded = decodeURIComponent(url);

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
