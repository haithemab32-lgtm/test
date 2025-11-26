export type OddsFormat =
  | "decimal"
  | "fractional"
  | "american"
  | "hongkong"
  | "malaysian"
  | "indonesian";

/**
 * Convertit une cote décimale vers le format spécifié
 */
export function formatOdds(
  decimalOdds: number | string,
  format: OddsFormat
): string {
  // Convertir en nombre si c'est une string
  const decimal =
    typeof decimalOdds === "string" ? parseFloat(decimalOdds) : decimalOdds;

  // Si la valeur est invalide ou "locked", retourner tel quel
  if (
    isNaN(decimal) ||
    decimalOdds === "locked" ||
    decimalOdds === null ||
    decimalOdds === undefined
  ) {
    return String(decimalOdds);
  }

  // PROTECTION: Ne JAMAIS formater une valeur <= 1
  // Si la valeur est <= 1, retourner "locked" immédiatement
  if (decimal <= 1 || !isFinite(decimal)) {
    console.warn("🔒 [formatOdds] Tentative de formater une cote <= 1:", {
      decimalOdds,
      decimal,
      format,
    });
    return "locked";
  }

  switch (format) {
    case "decimal":
      // Format décimal : 2.5, 3.75, etc.
      return decimal.toFixed(2);

    case "fractional":
      // Format fractionnaire : 3/2, 5/4, etc.
      return decimalToFractional(decimal);

    case "american":
      // Format américain : +150, -200, etc.
      return decimalToAmerican(decimal);

    case "hongkong":
      // Format Hong Kong : similaire au décimal mais sans le 1 initial
      // Exemple : 2.5 devient 1.50
      return (decimal - 1).toFixed(2);

    case "malaysian":
      // Format Malaisien : positif pour underdog, négatif pour favori
      // Exemple : 2.5 devient -0.66, 1.5 devient 0.50
      if (decimal >= 2.0) {
        return (1 / (decimal - 1)).toFixed(2);
      } else {
        return (-1 / (decimal - 1)).toFixed(2);
      }

    case "indonesian":
      // Format Indonésien : similaire à l'américain mais divisé par 100
      // Exemple : 2.5 devient 1.50, 1.5 devient -2.00
      if (decimal >= 2.0) {
        return ((decimal - 1) * 100).toFixed(2);
      } else {
        return ((-1 / (decimal - 1)) * 100).toFixed(2);
      }

    default:
      return decimal.toFixed(2);
  }
}

/**
 * Convertit une cote décimale en format fractionnaire
 */
function decimalToFractional(decimal: number): string {
  // Calculer le numérateur et dénominateur
  // decimal = 1 + (num/den) => num/den = decimal - 1
  const value = decimal - 1;

  // Si la valeur est négative ou invalide, retourner une valeur par défaut
  if (value <= 0 || !isFinite(value)) {
    return "1/1";
  }

  // Trouver la fraction la plus simple avec l'algorithme des fractions continues
  const tolerance = 0.0001;
  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let b = value;
  let iterations = 0;
  const maxIterations = 20; // Limiter les itérations pour éviter les boucles infinies

  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;

    if (k1 === 0) break; // Éviter la division par zéro

    const diff = Math.abs(value - h1 / k1);
    if (diff <= tolerance) break;

    b = 1 / (b - a);
    iterations++;

    // Éviter les boucles infinies
    if (iterations >= maxIterations || !isFinite(b)) {
      // Utiliser une approximation simple
      const num = Math.round(value * 100);
      const den = 100;
      const gcd = (a: number, b: number): number =>
        b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(num, den);
      return `${num / divisor}/${den / divisor}`;
    }
  } while (true);

  // Simplifier la fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  if (k1 === 0) {
    return "1/1";
  }
  const divisor = gcd(Math.abs(h1), Math.abs(k1));
  h1 = h1 / divisor;
  k1 = k1 / divisor;

  return `${h1}/${k1}`;
}

/**
 * Convertit une cote décimale en format américain
 */
function decimalToAmerican(decimal: number): string {
  if (decimal >= 2.0) {
    // Underdog : positif
    return `+${((decimal - 1) * 100).toFixed(0)}`;
  } else {
    // Favori : négatif
    return `${((-1 / (decimal - 1)) * 100).toFixed(0)}`;
  }
}
