import {
  Bet,
  BetSlip,
  BetSlipSaveResponse,
  BetSlipValidationResponse,
} from "../../types/betslip";
import { API_ENDPOINTS } from "../../config/api";

/**
 * Sauvegarder un BetSlip et obtenir un code de partage
 */
export async function saveBetSlip(
  bets: Bet[]
): Promise<BetSlipSaveResponse | null> {
  try {
    const response = await fetch(API_ENDPOINTS.BETSLIP_SAVE(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bets }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de la sauvegarde du BetSlip");
    }

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("Erreur saveBetSlip:", error);
    throw error;
  }
}

/**
 * Récupérer un BetSlip par son code
 */
export async function getBetSlip(code: string): Promise<BetSlip | null> {
  try {
    const response = await fetch(API_ENDPOINTS.BETSLIP_GET(code), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error: any = new Error(
        data.error || "Erreur lors de la récupération du BetSlip"
      );
      error.statusCode = response.status;
      throw error;
    }

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("Erreur getBetSlip:", error);
    throw error;
  }
}

/**
 * Valider les cotes d'un BetSlip
 */
export async function validateBetSlip(
  bets: Bet[]
): Promise<BetSlipValidationResponse | null> {
  try {
    // Log pour debug - voir exactement ce qui est envoyé
    if (process.env.NODE_ENV === "development") {
      console.log("📤 [validateBetSlip] Envoi des bets au backend:", {
        count: bets.length,
        bets: bets.map((bet) => ({
          fixtureId: bet.fixtureId,
          market: bet.market,
          selection: bet.selection,
          odd: bet.odd,
          handicap: bet.handicap,
        })),
      });
    }

    const response = await fetch(API_ENDPOINTS.BETSLIP_VALIDATE(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bets }),
    });

    const data = await response.json();

    // Log pour debug - voir la réponse du backend
    if (process.env.NODE_ENV === "development") {
      console.log("📥 [validateBetSlip] Réponse du backend:", {
        success: data.success,
        valid: data.data?.valid,
        changesCount: data.data?.changes?.length || 0,
        closedCount: data.data?.closed?.length || 0,
        closed:
          data.data?.closed?.map((c: any) => ({
            fixtureId: c.fixtureId,
            market: c.market,
            selection: c.selection,
            message: c.message,
          })) || [],
        errors: data.data?.errors || [],
      });
    }

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de la validation du BetSlip");
    }

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("Erreur validateBetSlip:", error);
    throw error;
  }
}

/**
 * Valider un BetSlip par code
 */
export async function validateBetSlipByCode(
  code: string
): Promise<BetSlipValidationResponse | null> {
  try {
    const response = await fetch(API_ENDPOINTS.BETSLIP_VALIDATE(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de la validation du BetSlip");
    }

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("Erreur validateBetSlipByCode:", error);
    throw error;
  }
}
