import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Bet, BetSlipValidationResponse } from "../types/betslip";
import {
  saveBetSlip,
  getBetSlip,
  validateBetSlip as validateBetSlipAPI,
} from "../services/api/betslip";
import { betslipLogger } from "../utils/betslipLogger";

interface BetSlipContextType {
  bets: Bet[];
  totalOdds: number;
  stake: number;
  potentialWin: number;
  shareCode: string | null;
  status: "active" | "expired" | "loading" | "error";
  validationResult: BetSlipValidationResponse | null;
  addBet: (bet: Bet) => void;
  removeBet: (fixtureId: number, market: string, selection: string) => void;
  clearBets: () => void;
  setStake: (amount: number) => void;
  calculateTotalOdds: () => number;
  shareBetSlip: () => Promise<string | null>;
  loadBetSlip: (code: string) => Promise<boolean>;
  validateBetSlip: () => Promise<BetSlipValidationResponse | null>;
  updateOddsAfterValidation: (
    changes: Array<{
      fixtureId: number;
      market: string;
      selection: string;
      handicap: string | null;
      newOdd: number;
    }>
  ) => void;
  clearValidationResult: () => void;
  isBetInSlip: (
    fixtureId: number,
    market: string,
    selection: string
  ) => boolean;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

const STORAGE_KEY = "betslip_bets";
const STORAGE_CODE_KEY = "betslip_code";

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [stake, setStakeState] = useState<number>(0);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "active" | "expired" | "loading" | "error"
  >("active");
  const [validationResult, setValidationResult] =
    useState<BetSlipValidationResponse | null>(null);

  // Charger les paris depuis localStorage au démarrage
  useEffect(() => {
    try {
      const savedBets = localStorage.getItem(STORAGE_KEY);
      const savedCode = localStorage.getItem(STORAGE_CODE_KEY);

      if (savedBets) {
        const parsedBets = JSON.parse(savedBets);
        setBets(parsedBets);
      }

      if (savedCode) {
        setShareCode(savedCode);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du BetSlip:", error);
    }
  }, []);

  // Sauvegarder les paris dans localStorage à chaque changement
  useEffect(() => {
    try {
      if (bets.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du BetSlip:", error);
    }
  }, [bets]);

  // Calculer les cotes totales
  const calculateTotalOdds = useCallback(() => {
    if (bets.length === 0) return 0;
    return bets.reduce((total, bet) => total * bet.odd, 1);
  }, [bets]);

  const totalOdds = calculateTotalOdds();
  const potentialWin = stake > 0 ? stake * totalOdds : 0;

  // Ajouter un pari
  // Permet les multiples paris pour un même match (différents marchés)
  const addBet = useCallback((bet: Bet) => {
    betslipLogger.log("➕ addBet appelé avec:", bet);
    setBets((prevBets) => {
      betslipLogger.currentBets(prevBets);
      // Vérifier si le pari existe déjà (même match, même marché, même sélection, même handicap)
      // Permet d'ajouter plusieurs paris pour le même match si les marchés sont différents
      const exists = prevBets.some(
        (b) =>
          b.fixtureId === bet.fixtureId &&
          b.market === bet.market &&
          b.selection === bet.selection &&
          (b.handicap === bet.handicap || (!b.handicap && !bet.handicap))
      );

      if (exists) {
        betslipLogger.warn("Pari déjà existant, non ajouté");
        return prevBets; // Ne pas ajouter de doublon exact
      }

      const newBets = [
        ...prevBets,
        { ...bet, timestamp: new Date().toISOString() },
      ];
      betslipLogger.betAdded(bet, newBets.length);
      return newBets;
    });
    setShareCode(null); // Réinitialiser le code si on ajoute un nouveau pari
    setValidationResult(null); // Réinitialiser la validation
  }, []);

  // Mettre à jour les cotes après confirmation
  const updateOddsAfterValidation = useCallback(
    (
      changes: Array<{
        fixtureId: number;
        market: string;
        selection: string;
        handicap: string | null;
        newOdd: number;
      }>
    ) => {
      setBets((prevBets) => {
        return prevBets.map((bet) => {
          const change = changes.find(
            (c) =>
              c.fixtureId === bet.fixtureId &&
              c.market === bet.market &&
              c.selection === bet.selection &&
              (c.handicap === bet.handicap || (!c.handicap && !bet.handicap))
          );
          if (change) {
            betslipLogger.log(
              `Mise à jour cote: ${bet.odd} → ${change.newOdd}`
            );
            return { ...bet, odd: change.newOdd };
          }
          return bet;
        });
      });
    },
    []
  );

  // Réinitialiser le résultat de validation
  const clearValidationResult = useCallback(() => {
    setValidationResult(null);
  }, []);

  // Retirer un pari
  const removeBet = useCallback(
    (fixtureId: number, market: string, selection: string) => {
      setBets((prevBets) =>
        prevBets.filter(
          (b) =>
            !(
              b.fixtureId === fixtureId &&
              b.market === market &&
              b.selection === selection
            )
        )
      );
      setShareCode(null);
      setValidationResult(null);
    },
    []
  );

  // Effacer tous les paris
  const clearBets = useCallback(() => {
    setBets([]);
    setShareCode(null);
    setStakeState(0);
    setValidationResult(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_CODE_KEY);
  }, []);

  // Définir la mise
  const setStake = useCallback((amount: number) => {
    setStakeState(amount);
  }, []);

  // Vérifier si un pari est dans le slip
  const isBetInSlip = useCallback(
    (fixtureId: number, market: string, selection: string) => {
      return bets.some(
        (b) =>
          b.fixtureId === fixtureId &&
          b.market === market &&
          b.selection === selection
      );
    },
    [bets]
  );

  // Partager le BetSlip
  const shareBetSlip = useCallback(async (): Promise<string | null> => {
    if (bets.length === 0) {
      return null;
    }

    setStatus("loading");
    try {
      const response = await saveBetSlip(bets);
      if (response && response.code) {
        setShareCode(response.code);
        localStorage.setItem(STORAGE_CODE_KEY, response.code);
        setStatus("active");
        return response.code;
      }
      setStatus("error");
      return null;
    } catch (error) {
      console.error("Erreur lors du partage du BetSlip:", error);
      setStatus("error");
      return null;
    }
  }, [bets]);

  // Charger un BetSlip par code
  const loadBetSlip = useCallback(async (code: string): Promise<boolean> => {
    setStatus("loading");
    try {
      const betSlip = await getBetSlip(code);
      if (betSlip && betSlip.bets) {
        setBets(betSlip.bets);
        setShareCode(betSlip.code);
        localStorage.setItem(STORAGE_CODE_KEY, betSlip.code);

        if (betSlip.status === "expired") {
          setStatus("expired");
        } else {
          setStatus("active");
        }
        return true;
      }
      setStatus("error");
      return false;
    } catch (error: any) {
      console.error("Erreur lors du chargement du BetSlip:", error);
      if (error.statusCode === 410) {
        setStatus("expired");
      } else {
        setStatus("error");
      }
      return false;
    }
  }, []);

  // Valider le BetSlip
  const validateBetSlip =
    useCallback(async (): Promise<BetSlipValidationResponse | null> => {
      if (bets.length === 0) {
        return null;
      }

      setStatus("loading");
      try {
        const result = await validateBetSlipAPI(bets);
        if (result) {
          setValidationResult(result);
          setStatus("active");
          return result;
        }
        setStatus("error");
        return null;
      } catch (error) {
        console.error("Erreur lors de la validation du BetSlip:", error);
        setStatus("error");
        return null;
      }
    }, [bets]);

  const value: BetSlipContextType = {
    bets,
    totalOdds,
    stake,
    potentialWin,
    shareCode,
    status,
    validationResult,
    addBet,
    removeBet,
    clearBets,
    setStake,
    calculateTotalOdds,
    shareBetSlip,
    loadBetSlip,
    validateBetSlip,
    updateOddsAfterValidation,
    clearValidationResult,
    isBetInSlip,
  };

  return (
    <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  }
  return context;
}
