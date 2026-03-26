/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#111111",
        secondary: "#FF772C",
        tertiary: "#181818",
        quaternary: "#1C1E1F",
        background: "#111111",
        surface: "#141414",
        "surface-2": "#181818",
        border: "#262626",
        text: "#FAFAFA",
        "text-secondary": "#242529",
        muted: "#A3A3A3",
        protein: "#7ED957",
        carbs: "#60A5FA",
        fats: "#F59E0B",
        accent: "#FF772C"
      },
      borderRadius: {
        card: "10px"
      },
      spacing: {
        18: "4.5rem"
      }
    }
  },
  plugins: []
};
