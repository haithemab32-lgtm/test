// src/components/Sidebar.tsx
'use client'

export default function Sidebar() {
  return (
    <aside className="bg-gray-900 text-white p-4 rounded-2xl shadow-lg w-72">
      <h2 className="font-semibold mb-3 text-accent">Mon pari</h2>
      <div className="text-sm text-gray-400">
        Aucun pari sélectionné pour le moment.
      </div>
    </aside>
  )
}
