/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        desktop: "1604px", // Breakpoint personnalisé à 1604px
      },
      colors: {
        dark: {
          bg: "#0A0A0A",
          card: "#1A1A1A",
          hover: "#222222",
        },
        accent: {
          DEFAULT: "#F5C518",
          alt: "#00D084",
        },
        text: {
          primary: "#FFFFFF",
          muted: "#9CA3AF",
        },
        danger: "#E63946",
        success: "#00FF7F",
      },
    },
  },
  plugins: [],
};
