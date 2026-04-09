import { BridgeBoard, Direction } from '@/types/bridge';

const SEAT_ORDER: Direction[] = ['North', 'East', 'South', 'West'];

const DEALER_LETTER: Record<Direction, string> = {
  North: 'N', East: 'E', South: 'S', West: 'W',
};

const NEXT_CW: Record<Direction, Direction> = {
  North: 'East', East: 'South', South: 'West', West: 'North',
};

const RANK_ORDER = 'AKQJT98765432';

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

/** Returns 'S'|'H'|'D'|'C' for a suited contract, 'N' for notrump, or null if no bids. */
function findTrump(auction: string[]): string | null {
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];
    if (call !== 'P' && call !== 'D' && call !== 'R') {
      return call[call.length - 1]; // last char: 'N','S','H','D','C'
    }
  }
  return null;
}

/** Returns the opening leader (LHO of declarer), or null if auction is all-pass/empty. */
function findLeader(auction: string[], dealer: Direction): Direction | null {
  const bidRecords: { direction: Direction; suit: string }[] = [];
  let dir = dealer;
  for (const call of auction) {
    if (call !== 'P' && call !== 'D' && call !== 'R') {
      bidRecords.push({ direction: dir, suit: call[call.length - 1] });
    }
    dir = NEXT_CW[dir];
  }
  if (bidRecords.length === 0) return null;

  const finalBid = bidRecords[bidRecords.length - 1];
  const finalSuit = finalBid.suit;
  const partner: Direction = NEXT_CW[NEXT_CW[finalBid.direction]];
  const declaringSide = new Set([finalBid.direction, partner]);

  for (const record of bidRecords) {
    if (record.suit === finalSuit && declaringSide.has(record.direction)) {
      return NEXT_CW[record.direction]; // LHO of declarer
    }
  }
  return NEXT_CW[finalBid.direction];
}

/** Returns the winning seat for a trick played in order (leader first). */
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
      if (wSuit !== trump || RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(wRank)) {
        winnerIdx = i;
      }
    } else if (suit === leadSuit && wSuit !== trump) {
      if (RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(wRank)) {
        winnerIdx = i;
      }
    }
  }
  return trick[winnerIdx].seat;
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

  // Play section
  const playLines: string[] = [];
  if (board.Play.length > 0) {
    const trump = findTrump(board.Auction) ?? 'N';
    const leader = findLeader(board.Auction, dealer);
    if (leader) {
      const leaderLetter = DEALER_LETTER[leader];
      // Fixed column order for the entire play section (never changes)
      const columnSeats: Direction[] = [0, 1, 2, 3].map(
        i => [leader, NEXT_CW[leader], NEXT_CW[NEXT_CW[leader]], NEXT_CW[NEXT_CW[NEXT_CW[leader]]]][i]
      );

      let trickLeader = leader;
      for (let t = 0; t * 4 + 3 < board.Play.length; t++) {
        // Cards stored in play order (trickLeader first, then CW)
        const trickCards = board.Play.slice(t * 4, t * 4 + 4);

        // Map each card to its seat (play order: trickLeader, CW+1, CW+2, CW+3)
        const trickWithSeats = trickCards.map((card, i) => ({
          seat: [trickLeader, NEXT_CW[trickLeader], NEXT_CW[NEXT_CW[trickLeader]], NEXT_CW[NEXT_CW[NEXT_CW[trickLeader]]]][i] as Direction,
          card,
        }));

        // Re-order into fixed column order for PBN
        const row: string[] = Array(4).fill('-');
        for (const { seat, card } of trickWithSeats) {
          row[columnSeats.indexOf(seat)] = card;
        }
        playLines.push(row.join(' '));

        trickLeader = trickWinner(trickWithSeats, trump);
      }

      playLines.unshift(`[Play "${leaderLetter}"]`);
    }
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

  if (playLines.length > 0) {
    lines.push(``, ...playLines, `*`);
  }

  return lines.join('\n') + '\n';
}
