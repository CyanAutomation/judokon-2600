import type { GameState } from "../state";
import { matchSummary, type Match } from "../game/game";
import { extractTacticalFeatures } from "../game/tacticalAssessment";
import { labels } from "./constants";
import type { StatKey } from "../api/types";

export interface TacticalNote {
  title: string;
  message: string;
}

function overRelianceMessage(
  enabled: boolean | undefined,
  decisiveStat: StatKey | null,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  if (!enabled || !decisiveStat || features.repeatedFailedSelections === 0) return null;
  const record = features.selections[decisiveStat];
  if (record.selected < 3 || record.losses <= record.wins) return null;
  return `${labels[decisiveStat]} was your go-to, with ${record.wins} win${record.wins === 1 ? "" : "s"} from ${record.selected} picks.`;
}

function adaptationMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const { decisions, switches } = features.choicesAfterLosses;
  if (!enabled || switches === 0) return null;
  return `After a loss, you switched stats on ${switches} of ${decisions} ${decisions === 1 ? "pick" : "picks"}.`;
}

function missedOpportunityMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const candidate = features.missedOpportunityCandidate;
  if (!enabled || !candidate) return null;
  const favored = features.selections[candidate.favoredStat];
  const alternative = features.selections[candidate.alternativeStat];
  return `${labels[candidate.alternativeStat]} won ${alternative.wins} of ${alternative.selected} picks. Your go-to, ${labels[candidate.favoredStat]}, won ${favored.wins} of ${favored.selected}.`;
}

function momentumResponseMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const decisions = features.choicesAfterWinRuns.decisions + features.choicesAfterLossRuns.decisions;
  const switches = features.choicesAfterWinRuns.switches + features.choicesAfterLossRuns.switches;
  if (!enabled || decisions === 0 || switches === 0) return null;
  return `After a win or loss streak, you switched stats on ${switches} of ${decisions} ${decisions === 1 ? "pick" : "picks"}.`;
}

/** App-authored titles and factual copy for the optional Dojo notes surface. */
export function tacticalNotes(m: Match, state: GameState): TacticalNote[] {
  const assessment = state.tacticalAssessment;
  if (!assessment) return [];

  const features = extractTacticalFeatures(m.scores, state.history);
  const details = matchSummary(m, state.history);
  const notes = [
    {
      title: "Repeated stat picks",
      message: overRelianceMessage(assessment.overReliance, details.decisiveStat, features),
    },
    {
      title: "Adjust after a loss",
      message: adaptationMessage(assessment.adaptation, features),
    },
    {
      title: "Another stat was effective",
      message: missedOpportunityMessage(assessment.missedOpportunity, features),
    },
    {
      title: "Respond after a streak",
      message: momentumResponseMessage(assessment.momentumResponse, features),
    },
  ];
  return notes.filter((note): note is TacticalNote => note.message !== null);
}

/** The same factual messages drive rendering and notification eligibility. */
export function tacticalMessages(m: Match, state: GameState): string[] {
  return tacticalNotes(m, state).map(({ message }) => message);
}
