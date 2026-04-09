import { BridgeBoard, Direction } from '@/types/bridge';

const SEAT_ORDER: Direction[] = ['North', 'East', 'South', 'West'];

const DEALER_LETTER: Record<Direction, string> = {
  North: 'N', East: 'E', South: 'S', West: 'W',
};

function internalToPbnCall(call: string): string {
  if (call === 'P') return 'Pass';
  if (call === 'D') return 'X';
  if (call === 'R') return 'XX';
  if (/^[1-7]N$/.test(call)) return call[0] + 'NT';
  return call;
}

function handToString(hand: { Spades: string; Hearts: string; Diamonds: string; Clubs: string }): string {
  return `${hand.Spades}.${hand.Hearts}.${hand.Diamonds}.${hand.Clubs}`;
}

export function buildPbn(board: BridgeBoard): string {
  const boardNum = board['Board number'];
  const dealer = board.Dealer;
  const dealerLetter = DEALER_LETTER[dealer];

  const handMap = Object.fromEntries(board.Seats.map(s => [s.Direction, s.Hand]));
  const dealParts = SEAT_ORDER.map(dir =>
    handToString(handMap[dir] ?? { Spades: '', Hearts: '', Diamonds: '', Clubs: '' })
  );
  const dealStr = `N:${dealParts.join(' ')}`;

  const pbnCalls = board.Auction.map(internalToPbnCall);
  const auctionLines: string[] = [];
  for (let i = 0; i < pbnCalls.length; i += 4) {
    auctionLines.push(pbnCalls.slice(i, i + 4).join(' '));
  }

  const lines: string[] = [
    `[Event ""]`,
    `[Site ""]`,
    `[Date ""]`,
    `[Board "${boardNum}"]`,
    ...SEAT_ORDER.map(dir => {
      const seat = board.Seats.find(s => s.Direction === dir);
      return `[${dir} "${seat?.Player ?? ''}"]`;
    }),
    `[Dealer "${dealerLetter}"]`,
    `[Vulnerable "None"]`,
    `[Deal "${dealStr}"]`,
    `[Scoring ""]`,
    `[Declarer ""]`,
    `[Contract ""]`,
    `[Result ""]`,
    ``,
    `[Auction "${dealerLetter}"]`,
    ...auctionLines,
    `*`,
  ];

  return lines.join('\n') + '\n';
}
