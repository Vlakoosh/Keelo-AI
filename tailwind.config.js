/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#181A1B",
        secondary: "#9BA8FF",
        tertiary: "#202326",
        quaternary: "#2A3034",
        background: "#181A1B",
        surface: "#202326",
        "surface-2": "#262A2D",
        border: "#343A3F",
        text: "#F5F5F5",
        "text-secondary": "#242529",
        muted: "#B8B8B8",
        protein: "#7ED957",
        carbs: "#60A5FA",
        fats: "#F59E0B",
        accent: "#9BA8FF",
      },
      borderRadius: {
        card: "10px",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
