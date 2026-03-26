/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#0A0A0A",
        "surface-2": "#111111",
        border: "#262626",
        text: "#FAFAFA",
        muted: "#A3A3A3",
        protein: "#7ED957",
        carbs: "#60A5FA",
        fats: "#F59E0B",
        accent: "#F5F5F5"
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
