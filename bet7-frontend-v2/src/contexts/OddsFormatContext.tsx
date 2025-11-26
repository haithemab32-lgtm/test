import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { OddsFormat } from "../utils/oddsFormatters";
export type { OddsFormat };

interface OddsFormatContextType {
  oddsFormat: OddsFormat;
  setOddsFormat: (format: OddsFormat) => void;
}

const OddsFormatContext = createContext<OddsFormatContextType | undefined>(
  undefined
);

export function OddsFormatProvider({ children }: { children: ReactNode }) {
  const [oddsFormat, setOddsFormatState] = useState<OddsFormat>(() => {
    // Récupérer le format depuis localStorage ou utiliser "decimal" par défaut
    const savedFormat = localStorage.getItem("oddsFormat") as OddsFormat;
    return savedFormat || "decimal";
  });

  useEffect(() => {
    // Sauvegarder le format dans localStorage
    localStorage.setItem("oddsFormat", oddsFormat);
  }, [oddsFormat]);

  const setOddsFormat = (newFormat: OddsFormat) => {
    setOddsFormatState(newFormat);
  };

  return (
    <OddsFormatContext.Provider value={{ oddsFormat, setOddsFormat }}>
      {children}
    </OddsFormatContext.Provider>
  );
}

export function useOddsFormat() {
  const context = useContext(OddsFormatContext);
  if (context === undefined) {
    throw new Error("useOddsFormat must be used within an OddsFormatProvider");
  }
  return context;
}
