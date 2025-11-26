import { Home, Settings, BarChart3 } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onReset?: () => void;
  onSettingsClick?: () => void;
}

export default function Header({
  onRefresh,
  isRefreshing,
  onReset,
  onSettingsClick,
}: HeaderProps) {
  const { theme } = useTheme();

  return (
    <header
      className={`${
        theme === "light"
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-[#2a2a2a] text-white border-gray-800"
      } border-b sticky top-0 z-50 py-3 md:gap-2 desktop:gap-4 gap-1 mt-2`}
    >
      <div className="flex items-start px-1 desktop:px-8">
        <div className="flex items-center gap-12 w-full justify-between px-1 desktop:px-8">
          {/* Icône Home */}
          <button
            className={`cursor-pointer hover:opacity-80 transition p-2 ${
              isRefreshing ? "animate-spin" : ""
            }`}
            onClick={onReset || onRefresh}
            title={
              onReset
                ? "Rétablir l'affichage initial"
                : "Rafraîchir les données"
            }
            disabled={isRefreshing}
          >
            <Home size={30} className="text-white" />
          </button>

          {/* Badge Direct */}
          <div
            className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-white font-semibold text-sm sm:text-base"
            style={{
              background: "linear-gradient(90deg, #ff0000 0%, #ff3d3d 100%)",
              boxShadow: "0 0 12px rgba(255, 0, 0, 0.6)",
              minWidth: "fit-content",
            }}
          >
            <span className="relative flex h-2.5 w-2.5 sm:h-3.5 sm:w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 bg-white"></span>
            </span>
            Direct
          </div>

          {/* Icônes histogram et settings */}
          <div className="flex items-center gap-4">
            <button className="cursor-pointer hover:opacity-80 transition p-2">
              <BarChart3 size={30} className="text-white" />
            </button>
            <button
              onClick={onSettingsClick}
              className="cursor-pointer hover:opacity-80 transition p-2"
              title="Configuration"
            >
              <Settings size={30} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
