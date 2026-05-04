/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FFFFFF",
        secondary: "#7FA56F",
        tertiary: "#FFFFFF",
        quaternary: "#E2E5DC",
        background: "#E8ECE5",
        surface: "#FFFFFF",
        "surface-2": "#F6F7F2",
        border: "#E2E5DC",
        text: "#171A17",
        "text-secondary": "#4E554E",
        muted: "#7C8379",
        protein: "#6EA77B",
        carbs: "#789AC1",
        fats: "#D6AC47",
        accent: "#7FA56F",
      },
      borderRadius: {
        card: "22px",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
