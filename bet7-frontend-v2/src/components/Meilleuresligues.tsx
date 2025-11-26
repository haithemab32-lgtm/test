import { useState, useMemo } from "react";
import { ALL_LEAGUES, type League } from "../data/leagues";
import { useTheme } from "../contexts/ThemeContext";

interface MeilleuresliguesProps {
  onLeagueClick?: (leagueId: number, leagueName: string) => void;
}

// Liste des meilleures ligues à afficher par défaut
const DEFAULT_LEAGUES: League[] = [
  { id: 2, flag: "world", name: "UEFA Champions League", country: "World" },
  { id: 3, flag: "world", name: "UEFA Europa League", country: "World" },
  {
    id: 848,
    flag: "world",
    name: "UEFA Europa Conference League",
    country: "World",
  },
  { id: 39, flag: "gb-eng", name: "Premier League", country: "England" },
  { id: 140, flag: "es", name: "La Liga", country: "Spain" },
  { id: 78, flag: "de", name: "Bundesliga", country: "Germany" },
  { id: 135, flag: "it", name: "Serie A", country: "Italy" },
  { id: 61, flag: "fr", name: "Ligue 1", country: "France" },
  { id: 94, flag: "pt", name: "Primeira Liga", country: "Portugal" },
  { id: 88, flag: "nl", name: "Eredivisie", country: "Netherlands" },
];

export default function Meilleuresligues({
  onLeagueClick,
}: MeilleuresliguesProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtrer les ligues selon la recherche
  const filteredLeagues = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const query = searchQuery.toLowerCase().trim();
    return ALL_LEAGUES.filter(
      (league) =>
        league.name.toLowerCase().includes(query) ||
        league.country.toLowerCase().includes(query) ||
        league.id.toString().includes(query)
    ).slice(0, 10); // Limiter à 10 résultats pour l'affichage
  }, [searchQuery]);

  const handleLeagueClick = (league: League) => {
    if (onLeagueClick) {
      onLeagueClick(league.id, league.name);
    }
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputFocus = () => {
    if (searchQuery.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const getFlagUrl = (flag: string) => {
    if (flag === "world") {
      return "https://flagcdn.com/w40/un.png"; // Ou une icône globe
    }
    return `https://flagcdn.com/w40/${flag}.png`;
  };

  return (
    <div
      className={`rounded-md shadow-md w-full p-3 relative ${
        theme === "light" ? "bg-white text-gray-900" : "bg-[#2a2a2a] text-white"
      }`}
    >
      <h2
        className={`text-[#f3c51c] font-bold font-Roboto mb-3 text-sm uppercase border-b pb-2 ${
          theme === "light" ? "border-gray-200" : "border-gray-700"
        }`}
      >
        MEILLEURES LIGUES
      </h2>

      <div className="flex flex-col gap-2 mb-3">
        {DEFAULT_LEAGUES.map((league) => (
          <div
            key={league.id}
            onClick={() => handleLeagueClick(league)}
            className={`flex items-center px-3 py-2 cursor-pointer border-b transition-colors ${
              theme === "light"
                ? "bg-white hover:bg-gray-50 border-gray-200"
                : "bg-[#2a2a2a] hover:bg-[#4a4a4a] border-gray-700"
            }`}
          >
            <img
              src={getFlagUrl(league.flag)}
              className="w-6 h-auto object-contain mr-4"
              alt={league.name}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span
              className={`text-sm ml-2 ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}
            >
              {league.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 relative">
        <input
          type="text"
          placeholder="Rechercher une ligue ou un pays..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`w-full text-sm px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-yellow-400 ${
            theme === "light"
              ? "bg-white text-gray-900 placeholder-gray-400 border border-gray-300"
              : "bg-[#2a2a2a] text-white placeholder-gray-400 border border-gray-700"
          }`}
        />

        {/* Liste de suggestions */}
        {showSuggestions && filteredLeagues.length > 0 && (
          <div
            className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-[#2a2a2a] border-gray-700"
            }`}
          >
            {filteredLeagues.map((league) => (
              <div
                key={league.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLeagueClick(league);
                }}
                onMouseDown={(e) => e.preventDefault()} // Empêcher le blur avant le clic
                className={`flex items-center px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0 ${
                  theme === "light"
                    ? "hover:bg-gray-50 border-gray-200"
                    : "hover:bg-[#4a4a4a] border-gray-800"
                }`}
              >
                <img
                  src={getFlagUrl(league.flag)}
                  className="w-5 h-auto object-contain mr-3"
                  alt={league.name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="flex-1">
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {league.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {league.country}
                    </span>
                    <span
                      className={`text-xs ${
                        theme === "light" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      #{league.id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredLeagues.length === 10 && (
              <div
                className={`px-3 py-2 text-xs text-center border-t ${
                  theme === "light"
                    ? "text-gray-500 border-gray-200"
                    : "text-gray-400 border-gray-800"
                }`}
              >
                ... et plus de résultats disponibles
              </div>
            )}
          </div>
        )}

        {showSuggestions &&
          searchQuery.length > 0 &&
          filteredLeagues.length === 0 && (
            <div
              className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg p-3 text-center ${
                theme === "light"
                  ? "bg-white border-gray-200"
                  : "bg-[#2a2a2a] border-gray-700"
              }`}
            >
              <span
                className={`text-sm ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Aucune ligue trouvée
              </span>
            </div>
          )}
      </div>
    </div>
  );
}
