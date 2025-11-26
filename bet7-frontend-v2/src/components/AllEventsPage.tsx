import React from "react";

const AllEventsPage: React.FC = () => {
  return (
    <div className="bg-[#2a2a2a] text-white min-h-screen">
      {/* Header Navigation */}
      <div className="bg-[#2a2a2a] border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-white hover:text-gray-300">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">HOME</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-400">FOOTBALL</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500 font-semibold">MATCH ODDS</span>
            </div>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <span className="text-lg">+</span>
            <span>Add to Coupon</span>
          </button>
        </div>
      </div>

      {/* Sports Navigation */}
      <div className="bg-[#2a2a2a] border-b border-gray-700 px-4 py-2">
        <div className="flex space-x-8">
          <div className="flex items-center space-x-2 text-red-500 border-b-2 border-red-500 pb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="font-semibold">FOOTBALL</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>BASKETBALL</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>ICE HOCKEY</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>TENNIS</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>HANDBALL</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>VOLLEYBALL</span>
          </div>
        </div>
      </div>

      {/* LIVE NOW Banner */}
      <div className="bg-blue-600 text-white text-center py-2 font-bold">
        LIVE NOW
      </div>

      {/* Odds Table Header */}
      <div className="bg-gray-600 px-4 py-2">
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold">
          <div className="bg-gray-500 px-2 py-1 rounded">1x2</div>
          <div className="bg-gray-500 px-2 py-1 rounded">Double Chance</div>
          <div className="bg-gray-500 px-2 py-1 rounded">Goals</div>
          <div className="bg-gray-500 px-2 py-1 rounded">Total</div>
          <div className="bg-gray-500 px-2 py-1 rounded">Over</div>
          <div className="bg-gray-500 px-2 py-1 rounded">Under</div>
          <div className="bg-gray-500 px-2 py-1 rounded">GG/NG</div>
        </div>
      </div>

      {/* League Sections */}
      <div className="space-y-1">
        {/* Liga de Ascenso, Apertura, Costa Rica */}
        <div className="bg-[#2a2a2a]">
          <div className="bg-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="https://flagcdn.com/w20/cr.png"
                alt="Costa Rica"
                width={20}
                height={15}
              />
              <span className="text-sm font-semibold">
                Liga de Ascenso, Apertura, Costa Rica
              </span>
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14l5-5 5 5z" />
              </svg>
            </button>
          </div>

          {/* Match Entry */}
          <div className="bg-purple-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">64773722</span>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  LIVE 9'
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center text-white text-sm">
                <span>0 Aserri FC</span>
                <span>0</span>
              </div>
              <div className="flex justify-between items-center text-white text-sm">
                <span>0 Pitbulls Santa Barbara FC</span>
                <span>0</span>
              </div>
            </div>

            {/* Odds Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                2.45
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                3.10
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                2.70
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.37
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.27
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.45
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                2.05
              </button>
            </div>
          </div>
        </div>

        {/* Copa Ecuador, Ecuador */}
        <div className="bg-[#2a2a2a]">
          <div className="bg-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="https://flagcdn.com/w20/ec.png"
                alt="Ecuador"
                width={20}
                height={15}
              />
              <span className="text-sm font-semibold">
                Copa Ecuador, Ecuador
              </span>
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14l5-5 5 5z" />
              </svg>
            </button>
          </div>

          {/* Match Entry */}
          <div className="bg-purple-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">64461619</span>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  LIVE 53'
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center text-white text-sm">
                <span>0 Guayaquil City FC</span>
                <span>0</span>
              </div>
              <div className="flex justify-between items-center text-white text-sm">
                <span>0 CS Emelec</span>
                <span>0</span>
              </div>
            </div>

            {/* Odds Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                3.55
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                2.10
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                2.90
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.32
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.60
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                1.22
              </button>
              <button className="bg-gray-700 text-white px-2 py-1 rounded text-xs">
                4.20
              </button>
            </div>
          </div>
        </div>

        {/* Other collapsed leagues */}
        <div className="bg-[#2a2a2a]">
          <div className="bg-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="https://flagcdn.com/w20/sv.png"
                alt="El Salvador"
                width={20}
                height={15}
              />
              <span className="text-sm font-semibold">
                Primera Division, Apertura, El Salvador
              </span>
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-[#2a2a2a]">
          <div className="bg-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="https://flagcdn.com/w20/ve.png"
                alt="Venezuela"
                width={20}
                height={15}
              />
              <span className="text-sm font-semibold">
                Primera Division, Venezuela
              </span>
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllEventsPage;
