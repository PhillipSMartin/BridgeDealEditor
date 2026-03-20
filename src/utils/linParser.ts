import { BridgeBoard, Direction, Hand } from '@/types/bridge';

const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];

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
      const hands = extractHands(decoded);
      const dealer = extractDealer(hands[0]);
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

      const seats = players.map((player, i) => ({
        Player: player,
        Direction: directionsSouthFirst[i],
        Hand: buildHand(splitSuits(hands[i])),
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
