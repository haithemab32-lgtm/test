import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useOddsFormat } from "../../contexts/OddsFormatContext";
import { formatOdds } from "../../utils/oddsFormatters";
import { betslipLogger } from "../../utils/betslipLogger";

const LockIcon = ({ theme }: { theme: "light" | "dark" }) => (
  <span
    className="flex items-center justify-center w-full h-full"
    title="Cote fermée"
  >
    <svg
      className="w-3 h-3"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-label="Cote fermée"
      style={{
        color: theme === "light" ? "#6b7280" : "#9ca3af",
      }}
    >
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);

interface OddsButtonProps {
  value: number | string;
  isMobile?: boolean;
  isExpanded?: boolean;
  changeDirection?: "up" | "down";
  label?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const OddsButton: React.FC<OddsButtonProps> = ({
  value,
  isMobile = false,
  isExpanded = false,
  changeDirection,
  label,
  onClick,
  isSelected = false,
}) => {
  const { theme } = useTheme();
  const { oddsFormat } = useOddsFormat();
  const [currentDirection, setCurrentDirection] = useState<
    "up" | "down" | undefined
  >(undefined);
  const [animationKey, setAnimationKey] = useState(0);

  // Détecter les changements de direction et forcer l'animation
  useEffect(() => {
    if (changeDirection) {
      // Toujours déclencher l'animation si on a une direction (même si c'est la même)
      // Cela permet de re-déclencher l'animation à chaque changement de cote
      // Réinitialiser d'abord pour forcer le re-render
      setCurrentDirection(undefined);
      setAnimationKey((prev) => prev + 1);

      // Utiliser requestAnimationFrame pour s'assurer que le DOM est prêt
      requestAnimationFrame(() => {
        setCurrentDirection(changeDirection);
        setAnimationKey((prev) => prev + 1);
      });

      // Réinitialiser après l'animation (2.5 secondes)
      const timer = setTimeout(() => {
        setCurrentDirection(undefined);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      // Si pas de direction, réinitialiser
      setCurrentDirection(undefined);
    }
  }, [changeDirection, value]);

  // Vérifier si la valeur est verrouillée
  // Une cote est verrouillée si :
  // 1. Elle est explicitement "locked"
  // 2. Elle est null ou undefined
  // 3. Elle est <= 1 (doit être verrouillée jusqu'à ce qu'elle devienne > 1)
  const getNumericValue = (): number | null => {
    // Si c'est déjà "locked", null ou undefined, retourner null
    if (value === "locked" || value === null || value === undefined) {
      return null;
    }

    // Si c'est un nombre, le retourner directement
    if (typeof value === "number") {
      return value;
    }

    // Si c'est une string, essayer de la convertir
    if (typeof value === "string") {
      // Nettoyer la string (enlever les espaces)
      const cleanedValue = value.trim();

      // Si c'est "locked" ou vide après nettoyage
      if (cleanedValue === "locked" || cleanedValue === "") {
        return null;
      }

      // Essayer de parser en nombre
      const parsed = parseFloat(cleanedValue);
      if (!isNaN(parsed) && isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const numericValue = getNumericValue();

  // DEBUG: Log toutes les valeurs <= 1 pour identifier le problème
  if (numericValue !== null && numericValue <= 1) {
    console.warn("🔒 [OddsButton] Valeur <= 1 détectée:", {
      originalValue: value,
      type: typeof value,
      numericValue,
      willBeLocked: numericValue <= 1,
    });
  }

  // FORCER l'affichage de l'icône de cadenas si la valeur est <= 1
  // Vérifier AVANT de formater pour éviter tout affichage de valeur <= 1
  const shouldShowLock =
    value === "locked" ||
    value === null ||
    value === undefined ||
    (numericValue !== null &&
      numericValue !== undefined &&
      typeof numericValue === "number" &&
      numericValue <= 1);

  // Formater la valeur selon le format choisi
  // IMPORTANT: Si shouldShowLock est true, on n'affiche JAMAIS la valeur formatée
  // On ne formate JAMAIS une valeur <= 1
  // VÉRIFICATION STRICTE: Ne formater QUE si numericValue > 1
  // Note: formattedValue n'est utilisé que si absoluteShouldShowLock est false
  // Si absoluteShouldShowLock est true, on affiche toujours l'icône de cadenas
  let formattedValue: string;
  if (shouldShowLock) {
    formattedValue = ""; // Ne sera pas utilisé car on affiche l'icône
  } else if (
    numericValue !== null &&
    numericValue !== undefined &&
    typeof numericValue === "number" &&
    numericValue > 1
  ) {
    formattedValue = formatOdds(numericValue, oddsFormat);
    // VÉRIFICATION FINALE: Si la valeur formatée est <= 1 (ne devrait jamais arriver), forcer ""
    const parsedFormatted = parseFloat(formattedValue);
    if (!isNaN(parsedFormatted) && parsedFormatted <= 1) {
      console.error("❌ [OddsButton] Valeur formatée <= 1 détectée!", {
        originalValue: value,
        numericValue,
        formattedValue,
        parsedFormatted,
      });
      formattedValue = ""; // Ne sera pas utilisé car on affiche l'icône
    }
  } else {
    formattedValue = ""; // Ne sera pas utilisé car on affiche l'icône
  }

  // DEBUG: Log pour vérifier les valeurs <= 1 qui ne sont pas verrouillées
  if (numericValue !== null && numericValue <= 1 && !shouldShowLock) {
    console.error(
      "❌ [OddsButton] ERREUR CRITIQUE: Cote <= 1 non verrouillée!",
      {
        originalValue: value,
        numericValue,
        shouldShowLock,
        formattedValue,
      }
    );
  }

  // TOUJOURS afficher l'icône de cadenas si shouldShowLock est true
  // Ne JAMAIS afficher formattedValue si la valeur est <= 1
  // VÉRIFICATION FINALE: Même si shouldShowLock est false, vérifier à nouveau numericValue
  const finalShouldShowLock =
    shouldShowLock ||
    (numericValue !== null &&
      numericValue !== undefined &&
      typeof numericValue === "number" &&
      numericValue <= 1);

  // VÉRIFICATION ABSOLUE: Si formattedValue contient une valeur <= 1, forcer le lock
  // Cela peut arriver si formatOdds retourne une valeur <= 1 (ne devrait jamais arriver)
  const parsedFormatted =
    typeof formattedValue === "string" &&
    formattedValue !== "" &&
    formattedValue !== "locked"
      ? parseFloat(formattedValue)
      : null;
  const absoluteShouldShowLock =
    finalShouldShowLock ||
    (parsedFormatted !== null &&
      !isNaN(parsedFormatted) &&
      parsedFormatted <= 1);

  // TOUJOURS afficher l'icône de cadenas si la valeur est <= 1, "locked", null, undefined, ou vide
  // Vérifier à nouveau pour être absolument sûr
  const isEmptyOrInvalid =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "") ||
    value === "locked" ||
    value === "—" ||
    value === "-";

  const shouldDisplayLock =
    absoluteShouldShowLock ||
    isEmptyOrInvalid ||
    value === "locked" ||
    value === null ||
    value === undefined ||
    (numericValue !== null &&
      numericValue !== undefined &&
      typeof numericValue === "number" &&
      numericValue <= 1) ||
    formattedValue === "" ||
    formattedValue === "locked";

  // DEBUG: Log pour identifier les cas où l'icône devrait s'afficher
  if (shouldDisplayLock && process.env.NODE_ENV === "development") {
    console.log("🔒 [OddsButton] Affichage de l'icône de cadenas:", {
      originalValue: value,
      numericValue,
      isEmptyOrInvalid,
      absoluteShouldShowLock,
      shouldDisplayLock,
      formattedValue,
    });
  }

  // TOUJOURS afficher l'icône de cadenas si shouldDisplayLock est true
  // Ne JAMAIS afficher "—" si la valeur devrait être verrouillée
  const displayValue = shouldDisplayLock ? (
    <LockIcon theme={theme} />
  ) : formattedValue ? (
    formattedValue
  ) : (
    <LockIcon theme={theme} /> // Si formattedValue est vide, afficher l'icône par défaut
  );

  // DEBUG: Si une valeur <= 1 n'affiche pas l'icône, c'est une erreur
  if (numericValue !== null && numericValue <= 1 && !shouldDisplayLock) {
    console.error(
      "❌❌❌ [OddsButton] ERREUR: Valeur <= 1 mais shouldDisplayLock est false!",
      {
        originalValue: value,
        numericValue,
        absoluteShouldShowLock,
        shouldDisplayLock,
        formattedValue,
      }
    );
  }

  // DEBUG: Si une valeur <= 1 est affichée, c'est une erreur critique
  if (numericValue !== null && numericValue <= 1 && !absoluteShouldShowLock) {
    console.error(
      "❌❌❌ [OddsButton] ERREUR CRITIQUE: Valeur <= 1 sera affichée!",
      {
        originalValue: value,
        numericValue,
        shouldShowLock,
        finalShouldShowLock,
        absoluteShouldShowLock,
        formattedValue,
        parsedFormatted,
      }
    );
  }

  // DEBUG: Log seulement si une valeur <= 1 n'est PAS verrouillée (erreur critique)
  if (numericValue !== null && numericValue <= 1 && !shouldDisplayLock) {
    console.error("❌❌❌ [OddsButton] ERREUR: Valeur <= 1 non verrouillée!", {
      originalValue: value,
      numericValue,
      shouldShowLock,
      finalShouldShowLock,
      absoluteShouldShowLock,
      shouldDisplayLock,
      formattedValue,
    });
  }

  // Classes de background selon la direction
  const getBackgroundClass = () => {
    if (!currentDirection) {
      return theme === "light"
        ? "bg-gray-100 hover:bg-gray-200"
        : "bg-gray-600 hover:bg-gray-500";
    }

    // Appliquer directement les classes d'animation
    if (currentDirection === "up") {
      return "animate-odds-gradient-up";
    }

    if (currentDirection === "down") {
      return "animate-odds-gradient-down";
    }

    return theme === "light"
      ? "bg-gray-100 hover:bg-gray-200"
      : "bg-gray-600 hover:bg-gray-500";
  };

  const bgClass = getBackgroundClass();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation vers la carte
    betslipLogger.click({
      value,
      onClick: !!onClick,
      isLocked: shouldDisplayLock,
    });
    if (onClick && !shouldDisplayLock) {
      onClick();
    } else if (shouldDisplayLock) {
      betslipLogger.warn("Bouton verrouillé, clic ignoré");
    } else if (!onClick) {
      betslipLogger.warn("onClick n'est pas défini!");
    }
  };

  return (
    <button
      key={`${value}-${animationKey}-${currentDirection || "none"}`}
      onClick={handleClick}
      disabled={shouldDisplayLock}
      className={`odds-button ${
        shouldDisplayLock
          ? theme === "light"
            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
            : "bg-gray-700 text-gray-500 cursor-not-allowed opacity-60"
          : bgClass
      } ${
        !shouldDisplayLock
          ? theme === "light"
            ? "text-gray-800"
            : "text-white"
          : ""
      } ${
        isMobile
          ? "px-2 py-2 rounded-md text-sm"
          : isExpanded
          ? "px-2 py-2 rounded-md text-xs"
          : "px-0.5 py-0.5 rounded-md text-[9px]"
      } w-full ${
        isMobile ? "h-10" : isExpanded ? "h-10" : "h-6"
      } flex items-center focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-yellow-500 relative ${
        !shouldDisplayLock && !currentDirection
          ? theme === "light"
            ? "hover:bg-gray-200 transition-colors"
            : "hover:bg-gray-500 transition-colors"
          : ""
      } ${
        (isMobile || isExpanded) && label ? "justify-between" : "justify-center"
      } ${
        isSelected && !shouldDisplayLock
          ? theme === "light"
            ? "ring-2 ring-yellow-400 bg-yellow-50"
            : "ring-2 ring-yellow-400 bg-yellow-900/20"
          : ""
      }`}
    >
      {(isMobile || isExpanded) && label ? (
        <span
          className={`${isMobile ? "text-sm" : "text-xs"} font-bold ${
            theme === "light" ? "text-gray-700" : "text-gray-300"
          }`}
        >
          {label}
        </span>
      ) : null}
      <span className="flex items-center justify-center">{displayValue}</span>
    </button>
  );
};

export default OddsButton;
