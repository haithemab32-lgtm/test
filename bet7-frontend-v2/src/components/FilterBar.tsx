'use client'
import { useState } from 'react'

export default function FilterBar() {
  const [selected, setSelected] = useState('all')

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'live', label: 'En direct' },
    { key: 'upcoming', label: 'À venir' },
    { key: 'finished', label: 'Terminés' },
  ]

  return (
    <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => setSelected(f.key)}
          className={`px-4 py-1 rounded-full text-sm font-semibold transition 
            ${
              selected === f.key
                ? 'bg-accent text-darkBg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
