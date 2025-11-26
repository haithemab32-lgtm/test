import { X, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useOddsFormat } from "../contexts/OddsFormatContext";
import type { OddsFormat } from "../utils/oddsFormatters";

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigurationModal({
  isOpen,
  onClose,
}: ConfigurationModalProps) {
  const { theme, setTheme } = useTheme();
  const { oddsFormat, setOddsFormat } = useOddsFormat();
  if (!isOpen) return null;

  const oddsFormats: {
    value: OddsFormat;
    label: string;
    example: string;
  }[] = [
    { value: "decimal", label: "Décimal", example: "2.5" },
    { value: "fractional", label: "Fractionnaire", example: "3/2" },
    { value: "american", label: "Américain", example: "+150" },
    { value: "hongkong", label: "Hong Kong", example: "1.50" },
    { value: "malaysian", label: "Malaisien", example: "-0.66" },
    { value: "indonesian", label: "Indonésien", example: "1.50" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${
          theme === "light"
            ? "bg-white text-gray-900"
            : "bg-[#2a2a2a] text-white"
        } rounded-lg shadow-xl w-full max-w-md mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <h2
            className={`text-xl font-semibold ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}
          >
            Configuration
          </h2>
          <button
            onClick={onClose}
            className={`${
              theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            } transition-colors`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Toggle */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label
                className={`text-sm font-medium ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Sombre
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "light"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  <Sun size={20} />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  <Moon size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Odds Format */}
          <div>
            <h3
              className={`text-sm font-medium mb-3 ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Format des cotes
            </h3>
            <div className="space-y-2">
              {oddsFormats.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    theme === "light"
                      ? "border-gray-200 hover:bg-gray-50"
                      : "border-gray-700 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="oddsFormat"
                      value={format.value}
                      checked={oddsFormat === format.value}
                      onChange={() => setOddsFormat(format.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {format.label}
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {format.example}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
