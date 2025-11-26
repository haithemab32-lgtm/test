import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { IconType } from "react-icons";
import {
  FaBasketballBall,
  FaVolleyballBall,
  FaBaseballBall,
  FaCar,
  FaFistRaised,
  FaFootballBall,
} from "react-icons/fa";
import { IoFootball } from "react-icons/io5";
import { MdSportsHandball, MdSportsHockey } from "react-icons/md";

interface Sport {
  name: string;
  icon: IconType;
}

interface SportsCarouselProps {
  cardSize?: "small" | "medium" | "large"; // 💡 plus flexible
  onSelect?: (sport: string) => void;
}

export default function SportsCarousel({
  cardSize = "medium",
  onSelect,
}: SportsCarouselProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const sports: Sport[] = [
    { name: "Football", icon: IoFootball },
    { name: "Basketball", icon: FaBasketballBall },
    { name: "Handball", icon: MdSportsHandball },
    { name: "Volleyball", icon: FaVolleyballBall },
    { name: "Baseball", icon: FaBaseballBall },
    { name: "Hockey", icon: MdSportsHockey },
    { name: "Rugby", icon: FaFootballBall },
    { name: "NFL", icon: FaFootballBall },
    { name: "NBA", icon: FaBasketballBall },
    { name: "AFL", icon: FaFootballBall },
    { name: "Formula 1", icon: FaCar },
    { name: "MMA", icon: FaFistRaised },
  ];

  const scroll = (dir: "left" | "right") => {
    const current = scrollRef.current;
    if (!current) return;
    const amount =
      dir === "left" ? -current.clientWidth / 1.3 : current.clientWidth / 1.3;
    current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const ScrollButton = ({ dir }: { dir: "left" | "right" }) => {
    const Icon = dir === "left" ? ChevronLeft : ChevronRight;
    return (
      <button
        onClick={() => scroll(dir)}
        className={`absolute ${
          dir === "left" ? "left-0" : "right-0"
        } top-1/2 -translate-y-1/2 z-20 p-2 rounded-full 
          bg-black/40 backdrop-blur-md text-white border border-white/20 
          hover:bg-indigo-600/70 hover:scale-110 transition-all duration-300 shadow-lg hidden md:block`}
        aria-label={`Scroll ${dir}`}
      >
        <Icon className="w-5 h-5" />
      </button>
    );
  };

  // taille des cartes selon le paramètre - réduites pour un affichage plus compact
  const sizeClasses =
    cardSize === "small"
      ? "w-[75px] h-[75px]"
      : cardSize === "large"
      ? "w-[110px] h-[110px]"
      : "w-[90px] h-[90px]";

  return (
    <div className="relative w-full max-w-6xl mx-auto px-1">
      <ScrollButton dir="left" />
      <ScrollButton dir="right" />

      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar scroll-smooth gap-2 py-1 px-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {sports.map((sport, i) => {
          const SportIcon = sport.icon;
          return (
            <div
              key={i}
              onClick={() => onSelect?.(sport.name)}
              className={`flex-shrink-0 ${sizeClasses} rounded-xl 
                ${
                  theme === "light"
                    ? "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
                    : "bg-gradient-to-br from-[#202020]/80 to-[#111111]/90 border border-white/10"
                }
                backdrop-blur-lg
                flex flex-col items-center justify-center
                hover:from-indigo-600/80 hover:to-indigo-800/70 
                hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.6)]
                hover:scale-[1.05] transition-all duration-300 cursor-pointer group`}
            >
              <div
                className={`p-2 rounded-full transition-all duration-300 ${
                  theme === "light"
                    ? "bg-gray-200/50 group-hover:bg-gray-300/50"
                    : "bg-white/10 group-hover:bg-white/20"
                }`}
              >
                {SportIcon ? (
                  <SportIcon
                    className={`w-6 h-6 md:w-7 md:h-7 drop-shadow-md group-hover:rotate-3 transition-transform duration-300 ${
                      theme === "light"
                        ? "text-gray-700 group-hover:text-indigo-600"
                        : "text-white"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-6 h-6 md:w-7 md:h-7 rounded-full ${
                      theme === "light" ? "bg-gray-300" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
              <p
                className={`text-[10px] md:text-xs font-medium mt-1.5 text-center transition-all duration-300 leading-tight ${
                  theme === "light"
                    ? "text-gray-700 group-hover:text-indigo-600"
                    : "text-gray-300 group-hover:text-white"
                }`}
              >
                {sport.name}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dégradé visuel gauche/droite pour mobile */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r ${
          theme === "light"
            ? "from-white to-transparent"
            : "from-[#0a0a0a] to-transparent"
        }`}
      ></div>
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${
          theme === "light"
            ? "from-white to-transparent"
            : "from-[#0a0a0a] to-transparent"
        }`}
      ></div>

      <p
        className={`text-[11px] text-center mt-1 md:hidden ${
          theme === "light" ? "text-gray-500" : "text-gray-500"
        }`}
      >
        Faites glisser pour explorer les sports
      </p>
    </div>
  );
}
