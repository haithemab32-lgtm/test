import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OddsFormatProvider } from "./contexts/OddsFormatContext";
import { BetSlipProvider } from "./contexts/BetSlipContext";

// Gestion des erreurs pour éviter l'écran blanc
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <OddsFormatProvider>
          <BetSlipProvider>
            <App />
          </BetSlipProvider>
        </OddsFormatProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Error rendering app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #1a1a1a; min-height: 100vh;">
      <h1>Erreur de chargement</h1>
      <p>Une erreur s'est produite lors du chargement de l'application.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
