import { useState } from "react";

/**
 * Hook pour gérer les ligues favorites
 */
export function useFavoriteLeagues() {
  const [favoriteLeagues, setFavoriteLeagues] = useState<Set<string>>(
    new Set()
  );

  const toggleFavoriteLeague = (leagueName: string) => {
    setFavoriteLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leagueName)) {
        newSet.delete(leagueName);
      } else {
        newSet.add(leagueName);
      }
      return newSet;
    });
  };

  return {
    favoriteLeagues,
    toggleFavoriteLeague,
  };
}
