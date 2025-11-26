import { useState } from "react";

/**
 * Hook pour gérer l'état des ligues pliées/dépliées
 */
export function useCollapsedLeagues() {
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(
    new Set()
  );

  const toggleLeagueCollapse = (leagueName: string) => {
    setCollapsedLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leagueName)) {
        newSet.delete(leagueName);
      } else {
        newSet.add(leagueName);
      }
      return newSet;
    });
  };

  const setCollapsedLeaguesDirectly = (leagues: Set<string>) => {
    setCollapsedLeagues(leagues);
  };

  return {
    collapsedLeagues,
    toggleLeagueCollapse,
    setCollapsedLeagues: setCollapsedLeaguesDirectly,
  };
}
