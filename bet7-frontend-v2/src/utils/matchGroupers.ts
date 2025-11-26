/**
 * Utilitaires pour grouper les matchs par différentes clés
 */

import { Match } from "../components/matchCard/type";
import { formatFullDate } from "./dateFormatters";

/**
 * Normalise le nom d'une ligue pour éviter les doublons
 * Gère les espaces multiples, les accents, et les variations de casse
 */
function normalizeLeagueName(leagueName: string): string {
  return leagueName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Normaliser les espaces multiples
    .normalize("NFD") // Décomposer les accents
    .replace(/[\u0300-\u036f]/g, ""); // Supprimer les accents
}

/**
 * Groupe les matchs par nom de ligue
 * Normalise les noms pour éviter les doublons (espaces, majuscules/minuscules)
 */
export function groupMatchesByLeague(
  matchesList: Match[]
): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {};
  const nameMap = new Map<string, string>(); // Map normalisé -> nom original

  matchesList.forEach((match) => {
    let leagueName: string;

    // Extraire le nom de la ligue
    if (typeof match.league === "string") {
      leagueName = match.league;
    } else if (match.league?.name) {
      leagueName = match.league.name;
    } else {
      leagueName = "Autres";
      console.warn(`Match ${match.id} has no league name, using "Autres"`, {
        league: match.league,
        leagueType: typeof match.league,
      });
    }

    // Normaliser le nom pour le regroupement
    const normalizedName = normalizeLeagueName(leagueName);

    // Si c'est la première fois qu'on voit cette ligue normalisée, garder le nom original
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, leagueName);
    }

    // Utiliser le nom original stocké pour la clé (pour garder la casse d'origine)
    const key = nameMap.get(normalizedName)!;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(match);
  });

  return grouped;
}

/**
 * Groupe les matchs par jour (date formatée)
 * Retourne un objet trié chronologiquement
 */
export function groupMatchesByDay(
  matchesList: Match[]
): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {};

  matchesList.forEach((match) => {
    let dateKey = "Date inconnue";

    // Priorité: fixtureDate > date > dateTime.day
    const dateString = match.fixtureDate || match.date;

    if (dateString) {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          dateKey = formatFullDate(dateString);
        }
      } catch (error) {
        console.error("Error parsing date:", dateString, error);
      }
    } else if (match.dateTime?.day && match.dateTime.day !== "N/A") {
      // Si on a seulement le jour formaté, l'utiliser directement
      dateKey = match.dateTime.day;
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(match);
  });

  // Trier les dates pour un affichage chronologique
  const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
    // Trouver les objets match correspondants pour extraire les dates
    const dateAObj = matchesList.find((m) => {
      const dateStr = m.fixtureDate || m.date;
      if (!dateStr) return false;
      try {
        const key = formatFullDate(dateStr);
        return key === dateA;
      } catch {
        return false;
      }
    });

    const dateBObj = matchesList.find((m) => {
      const dateStr = m.fixtureDate || m.date;
      if (!dateStr) return false;
      try {
        const key = formatFullDate(dateStr);
        return key === dateB;
      } catch {
        return false;
      }
    });

    const dateAStr = dateAObj?.fixtureDate || dateAObj?.date;
    const dateBStr = dateBObj?.fixtureDate || dateBObj?.date;

    // Comparer les timestamps
    const timeA = dateAStr ? new Date(dateAStr).getTime() : 0;
    const timeB = dateBStr ? new Date(dateBStr).getTime() : 0;

    return timeA - timeB;
  });

  return Object.fromEntries(sortedEntries);
}
