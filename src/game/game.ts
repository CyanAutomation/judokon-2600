import type { Judoka, StatKey } from "../api/types";

export type Outcome = "player" | "opponent" | "draw";
export type Phase = "selecting" | "awaitingNext" | "matchOver";
export type Winner = Outcome | null;
export type GameMode = "classic" | "champion";

export interface Match {
  player: Judoka;
  opponent: Judoka;
  target: number;
  round: number;
  scores: { player: number; opponent: number };
  mode: GameMode;
  phase: Phase;
  winner: Winner;
}

export interface RoundResult {
  outcome: Outcome;
  stat: StatKey;
  playerValue: number;
  opponentValue: number;
  match: Match;
}

export function createMatch(player: Judoka, opponent: Judoka, target: number, round = 1, scores = { player: 0, opponent: 0 }, mode: GameMode = "classic"): Match {
  if (!Number.isInteger(target) || target < 1) throw new Error("target must be a positive integer");
  return { player, opponent, target, round, scores, mode, phase: "selecting", winner: null };
}

export function selectStat(match: Match, stat: StatKey): RoundResult {
  if (match.phase !== "selecting") throw new Error("match is not ready for a stat selection");
  const playerValue = match.player.stats[stat];
  const opponentValue = match.opponent.stats[stat];
  const outcome: Outcome = playerValue === opponentValue ? "draw" : playerValue > opponentValue ? "player" : "opponent";
  const scores = {
    player: match.scores.player + Number(outcome === "player"),
    opponent: match.scores.opponent + Number(outcome === "opponent")
  };
  const hasWinner = scores.player >= match.target || scores.opponent >= match.target;
  const capped = match.round >= 25;
  const winner: Winner = hasWinner ? (scores.player > scores.opponent ? "player" : "opponent") : capped ? (scores.player === scores.opponent ? "draw" : scores.player > scores.opponent ? "player" : "opponent") : null;
  return {
    outcome,
    stat,
    playerValue,
    opponentValue,
    match: { ...match, scores, phase: winner === null ? "awaitingNext" : "matchOver", winner }
  };
}

/** Advance a match with the next draw. Champion mode retains only the player's judoka. */
export function nextRound(match: Match, nextPlayer: Judoka, nextOpponent: Judoka): Match {
  if (match.phase !== "awaitingNext") throw new Error("match is not ready for the next round");
  if (match.mode === "champion") return { ...match, opponent: nextOpponent, round: match.round + 1, phase: "selecting" };
  return createMatch(nextPlayer, nextOpponent, match.target, match.round + 1, match.scores, "classic");
}
