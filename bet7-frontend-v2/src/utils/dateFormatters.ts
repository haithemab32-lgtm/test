/**
 * Utilitaires pour le formatage des dates
 */

export interface FormattedDateTime {
  day: string;
  time: string;
}

/**
 * Formate une date ISO en format lisible (jour + heure)
 * @param dateString - Date au format ISO string
 * @returns Objet avec day et time formatés, ou "N/A" si invalide
 */
export function formatDateTime(
  dateString: string | undefined | null
): FormattedDateTime {
  if (!dateString) {
    return { day: "N/A", time: "N/A" };
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return { day: "N/A", time: "N/A" };
    }

    const day = date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
    const time = date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { day, time };
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return { day: "N/A", time: "N/A" };
  }
}

/**
 * Formate une date pour l'affichage complet avec jour de la semaine
 * @param dateString - Date au format ISO string
 * @returns Date formatée en français (ex: "lundi 31 octobre 2025")
 */
export function formatFullDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "Date inconnue";
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Date inconnue";
    }

    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting full date:", dateString, error);
    return "Date inconnue";
  }
}

/**
 * Vérifie si un match a commencé en comparant sa date/heure de début avec l'heure actuelle
 * @param match - Le match à vérifier
 * @param bufferMinutes - Buffer en minutes avant de considérer qu'un match a commencé (défaut: 1 minute)
 * @returns true si le match a commencé, false sinon
 */
export function hasMatchStarted(
  match: { date?: string; fixtureDate?: string | null },
  bufferMinutes: number = 1
): boolean {
  // Essayer d'obtenir la date de début du match
  const matchDateString = match.fixtureDate || match.date;

  if (!matchDateString) {
    return false; // Pas de date disponible, on ne peut pas déterminer
  }

  try {
    const matchDate = new Date(matchDateString);
    if (isNaN(matchDate.getTime())) {
      return false; // Date invalide
    }

    const now = new Date();
    // Ajouter le buffer (par défaut 1 minute) pour éviter les faux positifs
    const bufferMs = bufferMinutes * 60 * 1000;
    const matchStartWithBuffer = new Date(matchDate.getTime() + bufferMs);

    // Le match a commencé si l'heure actuelle est après l'heure de début + buffer
    return now >= matchStartWithBuffer;
  } catch (error) {
    console.error("Error checking if match has started:", error);
    return false;
  }
}
