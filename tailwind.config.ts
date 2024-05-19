import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        textcolor: "rgba(var(--foreground-rgb))",
        btnbg: "rgba(var(--btnbg))",
        btncolor: "rgba(var(--btncolor))",
        btnborder: "rgba(var(--btnborder))",
        btnhoverbg: "rgba(var(--btnhoverbg))",
        btnhovercolor: "rgba(var(--btnhovercolor))",
        btnactivebg: "rgba(var(--btnactivebg))",
        btnactivecolor: "rgba(var(--btnactivecolor))",
        btnfocusring: "rgba(var(--btnfocusring))",
        canvasbg: "rgba(var(--canvasbg))",
        canvasborder: "rgba(var(--canvasborder))",
        tabselected: "rgba(var(--tabselected))",
      }
    },
  },
  plugins: [],
};

export default config;
