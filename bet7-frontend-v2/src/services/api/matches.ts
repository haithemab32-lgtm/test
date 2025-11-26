/**
 * Services API pour les matchs - Backend v2
 */

import { API_ENDPOINTS } from "../../config/api";
import { ApiResponse, ApiMatchResponse } from "../../types/api";
import { transformApiDataToMatch } from "../../utils/matchTransformers";
import { Match } from "../../components/matchCard/type";

/**
 * Gère les erreurs de l'API selon le nouveau format
 */
function handleApiError(rawData: any, status: number): never {
  // Messages d'erreur plus clairs selon le code de statut
  let errorMessage = "Erreur inconnue";

  if (status === 500) {
    errorMessage =
      "Erreur serveur: Le serveur rencontre un problème temporaire. Veuillez réessayer plus tard.";
  } else if (status === 503) {
    errorMessage =
      "Service indisponible: Le serveur est temporairement surchargé. Veuillez réessayer dans quelques instants.";
  } else if (status === 404) {
    errorMessage = "Ressource non trouvée";
  } else if (status === 401 || status === 403) {
    errorMessage = "Erreur d'authentification: Vérifiez vos identifiants API.";
  } else if (status === 429) {
    errorMessage = "Trop de requêtes: Veuillez patienter avant de réessayer.";
  }

  if (
    rawData &&
    typeof rawData === "object" &&
    "success" in rawData &&
    !rawData.success
  ) {
    const apiErrorMessage = rawData.error || rawData.message;
    if (apiErrorMessage) {
      errorMessage = apiErrorMessage;
    }
  }

  const error = new Error(errorMessage);
  (error as any).status = status;
  (error as any).originalData = rawData;
  throw error;
}

/**
 * Récupère les matchs en direct
 */
export async function fetchLiveMatches(): Promise<{
  matches: Match[];
  count?: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Augmenté à 20 secondes

  try {
    const url = API_ENDPOINTS.LIVE_MATCHES();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleApiError(errorData, response.status);
    }

    const rawData = await response.json();

    let matchesData: ApiMatchResponse[] = [];
    let count: number | undefined;

    if (Array.isArray(rawData)) {
      matchesData = rawData;
    } else if (rawData && typeof rawData === "object" && "success" in rawData) {
      const apiResponse = rawData as ApiResponse<ApiMatchResponse[]>;

      if (!apiResponse.success) {
        handleApiError(apiResponse, response.status);
      }

      if (apiResponse.data && Array.isArray(apiResponse.data)) {
        matchesData = apiResponse.data;
        count = apiResponse.count;
      } else {
        throw new Error(
          "Format de données invalide: success est true mais data n'est pas un tableau"
        );
      }
    } else {
      throw new Error("Format de données inattendu de l'API");
    }

    if (matchesData.length === 0) {
      return {
        matches: [],
        count,
      };
    }

    const transformed = matchesData.map((apiMatch) =>
      transformApiDataToMatch(apiMatch)
    );

    return {
      matches: transformed,
      count,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Request timeout after 10 seconds");
      throw new Error("Timeout: Le serveur met trop de temps à répondre");
    }
    console.error("Error fetching live matches:", err);
    throw err;
  }
}

/**
 * Récupère les matchs à venir pour une ligue spécifique
 */
export async function fetchLeagueMatches(
  leagueId: number,
  limit?: number
): Promise<{ matches: Match[]; count?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Timeout de 20 secondes

  try {
    const url = API_ENDPOINTS.UPCOMING_MATCHES(leagueId, limit);
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleApiError(errorData, response.status);
    }

    const data: ApiResponse<ApiMatchResponse[]> = await response.json();

    if (!data.success) {
      handleApiError(data, response.status);
    }

    if (data.data && Array.isArray(data.data)) {
      return {
        matches: data.data.map((item) => transformApiDataToMatch(item)),
        count: data.count,
      };
    } else {
      throw new Error("Format de données invalide de l'API");
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Request timeout after 20 seconds");
      throw new Error("Timeout: Le serveur met trop de temps à répondre");
    }
    console.error("Error fetching league matches:", err);
    throw err;
  }
}

/**
 * Récupère les matchs à venir dans les prochaines heures
 * @param hours - Nombre d'heures (défaut: 8)
 * @param limit - Limite de résultats
 */
export async function fetchUpcomingMatches8H(
  hours?: number,
  limit?: number
): Promise<{ matches: Match[]; count?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Timeout de 20 secondes

  try {
    const url = API_ENDPOINTS.UPCOMING_MATCHES_IN_HOURS(hours, limit);
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleApiError(errorData, response.status);
    }

    const rawData = await response.json();

    let matchesData: ApiMatchResponse[] = [];
    let count: number | undefined;

    // Gérer différents formats de réponse
    if (Array.isArray(rawData)) {
      // Format direct : tableau de matchs
      matchesData = rawData;
    } else if (rawData && typeof rawData === "object" && "success" in rawData) {
      // Format avec success/data
      const apiResponse = rawData as ApiResponse<ApiMatchResponse[]>;

      if (!apiResponse.success) {
        handleApiError(apiResponse, response.status);
      }

      if (apiResponse.data && Array.isArray(apiResponse.data)) {
        matchesData = apiResponse.data;
        count = apiResponse.count;
      } else {
        // Retourner un tableau vide au lieu de lancer une erreur
        return {
          matches: [],
          count: 0,
        };
      }
    } else {
      // Retourner un tableau vide au lieu de lancer une erreur
      return {
        matches: [],
        count: 0,
      };
    }

    if (matchesData.length === 0) {
      return {
        matches: [],
        count: count || 0,
      };
    }

    const transformed = matchesData.map((item) =>
      transformApiDataToMatch(item)
    );

    return {
      matches: transformed,
      count,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Request timeout after 20 seconds");
      throw new Error("Timeout: Le serveur met trop de temps à répondre");
    }
    console.error("Error fetching upcoming matches:", err);
    throw err;
  }
}

/**
 * Récupère les matchs pour une date spécifique
 */
export async function fetchMatchesByDate(
  date: string,
  endDate?: string,
  leagueId?: number,
  season?: number
): Promise<{ matches: Match[]; count?: number }> {
  try {
    const url = API_ENDPOINTS.DAILY_MATCHES(date, endDate, leagueId, season);
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleApiError(errorData, response.status);
    }

    const data: ApiResponse<ApiMatchResponse[]> = await response.json();

    if (!data.success) {
      handleApiError(data, response.status);
    }

    if (data.data && Array.isArray(data.data)) {
      return {
        matches: data.data.map((item) => transformApiDataToMatch(item)),
        count: data.count,
      };
    } else {
      throw new Error("Format de données invalide de l'API");
    }
  } catch (err) {
    console.error("Error fetching matches by date:", err);
    throw err;
  }
}

/**
 * Récupère les matchs pour une ligue spécifique
 * @param leagueId - ID de la ligue (requis)
 * @param season - Saison (optionnel)
 * @param next - Nombre de matchs à venir (défaut: 10)
 */
export async function fetchLeagueMatchesById(
  leagueId: number,
  season?: number,
  next?: number
): Promise<{ matches: Match[]; count?: number }> {
  try {
    const url = API_ENDPOINTS.LEAGUE_MATCHES(leagueId, season, next);
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleApiError(errorData, response.status);
    }

    const data: ApiResponse<ApiMatchResponse[]> = await response.json();

    if (!data.success) {
      handleApiError(data, response.status);
    }

    if (data.data && Array.isArray(data.data)) {
      return {
        matches: data.data.map((item) => transformApiDataToMatch(item)),
        count: data.count,
      };
    } else {
      throw new Error("Format de données invalide de l'API");
    }
  } catch (err) {
    console.error("Error fetching league matches:", err);
    throw err;
  }
}
