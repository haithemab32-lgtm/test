import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

type DateItem = {
  id: string;
  label: string;
  active: boolean;
  date?: string | null;
};

interface DateCarouselProps {
  onDateSelect?: (date: string | null) => void;
  daysCount?: number; // 💡 flexibilité : nombre de jours à afficher
  startDate?: Date; // 💡 permet de définir un point de départ
}

export default function DateCarousel({
  onDateSelect,
  daysCount = 10,
  startDate,
}: DateCarouselProps) {
  const { theme } = useTheme();
  const [dates, setDates] = useState<DateItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const base = startDate ? new Date(startDate) : new Date();
    const tmp: DateItem[] = [];

    const todayStr = base.toISOString().split("T")[0];
    tmp.push({
      id: "today",
      label: "Aujourd'hui",
      active: true,
      date: todayStr,
    });

    for (let i = 1; i <= daysCount; i++) {
      const next = new Date(base);
      next.setDate(base.getDate() + i);
      const dayName = next
        .toLocaleDateString("fr-FR", { weekday: "short" })
        .replace(".", "");
      const dateStr = next.toISOString().split("T")[0];
      tmp.push({
        id: `d-${i}`,
        label: `${dayName}. ${next.getDate()}`,
        active: false,
        date: dateStr,
      });
    }

    tmp.push({ id: "all", label: "Tout", active: false, date: null });
    setDates(tmp);
  }, [daysCount, startDate]);

  const scrollBy = (offset: number) => {
    containerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const onClickItem = (index: number) => {
    const clickedDate = dates[index];
    setDates((prev) => prev.map((d, i) => ({ ...d, active: i === index })));

    onDateSelect?.(clickedDate.id === "all" ? null : clickedDate.date || null);

    // centrage automatique
    const container = containerRef.current;
    const el = container?.children[index] as HTMLElement | undefined;
    if (container && el) {
      const targetScroll =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full py-1">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Bouton gauche */}
      <button
        aria-label="scroll left"
        onClick={() => scrollBy(-180)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18L9 12L15 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Liste horizontale - espacement réduit */}
      <div
        ref={containerRef}
        className="flex gap-1.5 px-2 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {dates.map((d, i) => (
          <div
            key={d.id}
            onClick={() => onClickItem(i)}
            className={`flex flex-col items-center justify-center flex-shrink-0 px-3 py-1.5 rounded-lg cursor-pointer select-none border backdrop-blur-sm transition-all text-sm font-medium
              ${
                d.active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border-transparent scale-105"
                  : theme === "light"
                  ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  : "bg-[#1c1c1e]/60 border border-gray-700/50 text-gray-300 hover:bg-[#2a2a2a] hover:border-gray-600"
              }
            `}
            style={{ minWidth: 75, textAlign: "center" }}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* Bouton droite */}
      <button
        aria-label="scroll right"
        onClick={() => scrollBy(180)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 6L15 12L9 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dégradé latéral */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r ${
          theme === "light"
            ? "from-white to-transparent"
            : "from-[#0d0d0d] to-transparent"
        }`}
      ></div>
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${
          theme === "light"
            ? "from-white to-transparent"
            : "from-[#0d0d0d] to-transparent"
        }`}
      ></div>
    </div>
  );
}
