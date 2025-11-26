import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useBetSlip } from "../contexts/BetSlipContext";

export default function Recherche() {
  const { theme } = useTheme();
  const { loadBetSlip, status } = useBetSlip();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) {
      setError("Veuillez entrer un code");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const loaded = await loadBetSlip(code.trim().toUpperCase());
      if (loaded) {
        setSuccess(true);
        setCode("");
        // Réinitialiser le message de succès après 3 secondes
        setTimeout(() => setSuccess(false), 3000);
      } else {
        if (status === "expired") {
          setError("Ce ticket est expiré");
        } else {
          setError("Ticket introuvable");
        }
      }
    } catch (err: any) {
      if (err.statusCode === 410) {
        setError("Ce ticket est expiré");
      } else if (err.statusCode === 404) {
        setError("Ticket introuvable");
      } else {
        setError("Erreur lors du chargement du ticket");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md shadow-md w-full p-3 ${
        theme === "light"
          ? "bg-white text-gray-900"
          : "bg-[#2a2a2a] text-accent"
      }`}
    >
      <p
        className={`text-lg font-semibold uppercase ${
          theme === "light" ? "text-gray-900" : "text-accent"
        }`}
      >
        Recherchez
      </p>
      <div
        className={`w-full h-px my-2 ${
          theme === "light" ? "bg-gray-200" : "bg-black"
        }`}
      ></div>
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Entrer le code du ticket"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
            setSuccess(false);
          }}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className={`text-sm px-3 py-2 rounded-md outline-none placeholder-orange-400 focus:ring-2 focus:ring-yellow-400 w-full pr-8 uppercase ${
            theme === "light"
              ? "bg-white text-gray-900 border border-gray-300"
              : "bg-[#2a2a2a] text-white"
          } ${
            error
              ? "border-red-500 focus:ring-red-500"
              : success
              ? "border-green-500 focus:ring-green-500"
              : ""
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !code.trim()}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
            isLoading || !code.trim()
              ? "text-gray-400 cursor-not-allowed"
              : "text-orange-400 hover:text-orange-500 cursor-pointer"
          }`}
          title="Rechercher"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <span>🔎</span>
          )}
        </button>
      </div>
      {error && (
        <p
          className={`text-xs mt-2 text-red-500 ${
            theme === "light" ? "text-red-600" : "text-red-400"
          }`}
        >
          {error}
        </p>
      )}
      {success && (
        <p
          className={`text-xs mt-2 ${
            theme === "light" ? "text-green-600" : "text-green-400"
          }`}
        >
          ✅ Ticket chargé avec succès !
        </p>
      )}
    </div>
  );
}
