export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
export type Direction = 'North' | 'South' | 'East' | 'West';

export interface Hand {
  Spades: string;
  Hearts: string;
  Diamonds: string;
  Clubs: string;
}

export interface Seat {
  Player?: string;
  Direction: Direction;
  Hand: Hand;
}

export type Vulnerability = 'None' | 'NS' | 'EW' | 'Both';

export interface BridgeBoard {
  'Board number': number;
  'Dealer': Direction;
  'Vulnerability'?: Vulnerability;
  'Auction': string[];
  'Seats': Seat[];
  'Play': string[];
}

export interface CardInfo {
  suit: Suit;
  rank: string;
  direction: Direction;
}

export interface PlayCard {
  card: string;
  order: number;
  confirmed: boolean;
}