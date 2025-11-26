export default function Footer() {
  return (
    <footer className="bg-darkBg border-t border-gray-800 text-gray-400 text-center py-4 mt-10">
      <p>
        © {new Date().getFullYear()} <span className="text-accent">BetZone</span> — Tous droits réservés.
      </p>
      <p className="text-xs mt-1">
        Jeu responsable | Conditions d’utilisation | Contact
      </p>
    </footer>
  )
}
