/**
 * Service API pour les détails d'un match
 */

import { API_ENDPOINTS } from "../../config/api";
import { ApiResponse, MatchDetails } from "../../types/api";

/**
 * Récupère les détails complets d'un match
 */
export async function fetchMatchDetails(
  fixtureId: number
): Promise<MatchDetails> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

  try {
    const url = API_ENDPOINTS.MATCH_DETAILS(fixtureId);
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
      throw new Error(
        errorData.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: ApiResponse<MatchDetails> = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch match details");
    }

    return data.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Request timeout: Le serveur met trop de temps à répondre"
      );
    }
    throw error;
  }
}
