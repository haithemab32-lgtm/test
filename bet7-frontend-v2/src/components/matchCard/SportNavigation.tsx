import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const SportNavigation: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div
      className={`border-b px-4 py-2 ${
        theme === "light"
          ? "bg-white border-gray-200"
          : "bg-[#2a2a2a] border-gray-700"
      }`}
    >
      <div className="flex space-x-8">
        <div className="flex items-center space-x-2 text-red-500 border-b-2 border-red-500 pb-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="font-semibold">FOOTBALL</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            theme === "light"
              ? "text-gray-500 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>BASKETBALL</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            theme === "light"
              ? "text-gray-500 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>ICE HOCKEY</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            theme === "light"
              ? "text-gray-500 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>TENNIS</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            theme === "light"
              ? "text-gray-500 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>HANDBALL</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            theme === "light"
              ? "text-gray-500 hover:text-gray-700"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>VOLLEYBALL</span>
        </div>
      </div>
    </div>
  );
};

export default SportNavigation;
