import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#20202a",
        berry: "#e83f6f",
        mango: "#ffbf46",
        mint: "#55d6be",
        sky: "#2f80ed",
        lilac: "#8e6cff",
        cream: "#fff7e8"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(32, 32, 42, 0.12)",
        pop: "0 10px 0 rgba(32, 32, 42, 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
