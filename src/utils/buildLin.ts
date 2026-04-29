import { BridgeBoard, Direction, Vulnerability } from '@/types/bridge';

const DIRECTIONS: Direction[] = ['West', 'North', 'East', 'South'];

const DEALER_INDEX: Record<Direction, number> = {
  South: 1, West: 2, North: 3, East: 4,
};

const VUL_TO_LIN: Record<Vulnerability, string> = {
  None: 'o', NS: 'n', EW: 'e', Both: 'b',
};

function buildHandSegment(hand: { Spades: string; Hearts: string; Diamonds: string; Clubs: string }): string {
  return `S${hand.Spades}H${hand.Hearts}D${hand.Diamonds}C${hand.Clubs}`;
}

/**
 * Builds a LIN-format string for the given board and play sequence.
 * The output is the raw LIN content suitable for saving as a .lin file
 * or embedding after `?lin=` in a BBO handviewer URL.
 *
 * Tag order: md | rh | ah | sv | pn | st | mb… | pc…
 */
export function buildLin(board: BridgeBoard, playCards: Map<string, number>): string {
  const seatMap = Object.fromEntries(board.Seats.map(s => [s.Direction, s]));

  // Hands in South, West, North, East order; dealer index prefixed on South's hand
  const dirsSouthFirst: Direction[] = [
    ...DIRECTIONS.slice(DIRECTIONS.indexOf('South')),
    ...DIRECTIONS.slice(0, DIRECTIONS.indexOf('South')),
  ];

  const handSegments: string[] = dirsSouthFirst.map((dir, i) => {
    const hand = seatMap[dir]?.Hand ?? { Spades: '', Hearts: '', Diamonds: '', Clubs: '' };
    const segment = buildHandSegment(hand);
    return i === 0 ? `${DEALER_INDEX[board.Dealer]}${segment}` : segment;
  });

  const mdTag = `md|${handSegments.join(',')}|`;

  const boardNum = board['Board number'];
  const ahTag = boardNum != null ? `ah|Board ${boardNum}|` : 'ah||';

  const svTag = board.Vulnerability !== undefined
    ? `sv|${VUL_TO_LIN[board.Vulnerability]}|`
    : '';

  const players = dirsSouthFirst.map(dir => seatMap[dir]?.Player ?? '');
  const pnTag = `pn|${players.join(',')}|`;

  const auctionTags = (board.Auction ?? [])
    .filter(c => c !== '?')
    .map(c => `mb|${c}|`)
    .join('');

  const playSequence = Array.from(playCards.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([card]) => card);
  const playTags = playSequence.map(card => `pc|${card}|`).join('');

  return `${mdTag}rh||${ahTag}${svTag}${pnTag}st||${auctionTags}${playTags}`;
}
