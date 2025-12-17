export enum Suit {
  Spade = '♠',
  Heart = '♥',
  Club = '♣',
  Diamond = '♦',
  Joker = '★'
}

export enum Rank {
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
  Two = '2',
  SmallJoker = 'SJ',
  BigJoker = 'BJ'
}

export interface Card {
  id: string; // Unique ID for React keys
  suit: Suit;
  rank: Rank;
  value: number; // For sorting: 3=3...A=14, 2=15, SJ=16, BJ=17
  points: number; // 5, 10, K = 5/10/10 points
}

export enum HandType {
  Single,
  Pair,
  Triplet,
  // FullHouse removed per rules
  Bomb4Plus, // 4+ same rank
  Bomb510K, // 5-10-K sequence
  Bomb3SameSuit, // 3 cards same rank same suit
  Invalid
}

export interface PlayedHand {
  cards: Card[];
  playerId: number;
  type: HandType;
  primaryValue: number; // Rank value of the main part
  length: number; // Used for bomb comparison
  subTypeLevel?: number; // 0=Mixed 510K, 1=Pure 510K
}

export interface Player {
  id: number; // 0-3 in the context of a game
  name: string;
  isBot: boolean; // Distinguish human vs bot
  hand: Card[];
  team: number; // 0 or 1
  score: number; // Points collected (5, 10, K)
  cardsPointsCaptured: Card[]; // Actual cards captured for verification
  finishedRank: number | null; // 1, 2, 3, 4 or null if playing
  lastPlayedHand: Card[] | null; // To check for "Drag 3" rule
  // Network specific
  networkId?: string; // UUID for connecting network players to game slots
  
  // Display state for current round
  currentRoundAction: 'PLAY' | 'PASS' | null;
  currentRoundCards: Card[] | null;
}

export interface GameHistory {
  turn: number;
  playerId: number;
  action: 'PLAY' | 'PASS';
  cards?: Card[];
}

// --- Network / Lobby Types ---

export interface LobbyPlayer {
  id: string; // UUID
  name: string;
  tableId: number | null;
  seatIndex: number | null; // 0-3
  totalScore: number; // Accumulated score across games
}

export interface GameTable {
  id: number;
  players: (LobbyPlayer | null)[]; // 4 slots
  hostId: string | null;
  status: 'WAITING' | 'PLAYING';
  bots: number[]; // Indices of slots that are bots
}

export interface NetworkMessage {
  type: 'LOBBY_UPDATE' | 'GAME_STATE_UPDATE' | 'PLAYER_ACTION' | 'GAME_START';
  payload: any;
  senderId: string;
}

export interface GameStateSync {
  players: Player[];
  gamePhase: string;
  turn: number;
  lastPlayedHand: PlayedHand | null;
  passCount: number;
  currentTrickCards: Card[];
  history: GameHistory[];
  trickPoints: Card[];
  winners: number[];
  firstRH4Player: number;
  doubleRH4Player: number;
  isFirstTurnOfGame: boolean;
  message: string;
  stealTimer: number;
}