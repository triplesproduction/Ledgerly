import type { Config } from "tailwindcss";

const config = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        fontFamily: {
            sans: ["var(--font-montserrat)", "sans-serif"],
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // 🎨 Custom Fintech Palette
                surface: {
                    100: "#14161C", // Primary Card
                    200: "#1A1D24", // Secondary Card
                    300: "#21242C", // Hover State
                },
                brand: {
                    orange: "#FF7A18",
                    red: "#FF3D00",
                    deepRed: "#C21807",
                    purple: "#6A5CFF",
                    pink: "#9B6BFF",
                    green: "#00E676",
                }
            },
            backgroundImage: {
                'gradient-app': 'linear-gradient(180deg, #0F1013 0%, #15171C 50%, #0C0D10 100%)',
                'gradient-primary': 'linear-gradient(90deg, #FF7A18 0%, #FF3D00 50%, #C21807 100%)',
                'gradient-secondary': 'linear-gradient(90deg, #6A5CFF 0%, #9B6BFF 50%, #C77DFF 100%)',
                'gradient-success': 'linear-gradient(90deg, #00E676 0%, #00C853 100%)',
                'gradient-card-hover': 'linear-gradient(180deg, rgba(255,122,24,0.05) 0%, rgba(20,22,28,0) 100%)', // Subtle orange glow
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
