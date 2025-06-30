/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        inter: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
        rajdhani: ["Rajdhani", "ui-sans-serif", "system-ui"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--primary-light))",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // Orange-500
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
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
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        'orange-glow': "hsl(var(--orange-glow))",
        'victory-green': "hsl(var(--victory-green))",
        'defeat-red': "hsl(var(--defeat-red))",
        neon: {
          orange: "hsl(var(--orange-neon))",
          blue: "hsl(var(--blue-neon))",
          green: "hsl(var(--green-neon))",
          red: "hsl(var(--red-neon))",
          purple: "hsl(var(--purple-neon))",
        },
        faceit: {
          orange: "hsl(var(--faceit-orange))",
          dark: "hsl(var(--faceit-dark))",
          card: "hsl(var(--faceit-card))",
          border: "hsl(var(--faceit-border))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        'gaming-xl': ['3.5rem', { lineHeight: '1', letterSpacing: '0.05em' }],
        'gaming-lg': ['2.5rem', { lineHeight: '1.1', letterSpacing: '0.05em' }],
        'gaming-md': ['2rem', { lineHeight: '1.2', letterSpacing: '0.05em' }],
        'gaming-sm': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0.05em' }],
      },
      boxShadow: {
        'gaming': '0 4px 20px hsl(var(--primary) / 0.2)',
        'gaming-lg': '0 8px 30px hsl(var(--primary) / 0.3)',
        'neon': '0 0 20px hsl(var(--primary) / 0.4)',
        'neon-lg': '0 0 30px hsl(var(--primary) / 0.6)',
        'victory': '0 0 20px hsl(120 60% 50% / 0.4)',
        'defeat': '0 0 20px hsl(0 85% 60% / 0.4)',
        'minimal': '0 2px 8px hsl(var(--muted) / 0.1)',
        'soft': '0 4px 12px hsl(var(--muted) / 0.15)',
        'medium': '0 8px 24px hsl(var(--muted) / 0.2)',
        'large': '0 12px 40px hsl(var(--muted) / 0.25)',
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "competitive-glow": "competitiveGlow 2s ease-in-out infinite alternate",
        "victory-pulse": "victoryPulse 1.5s ease-in-out infinite",
        "defeat-shake": "defeatShake 0.5s ease-in-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "neon-pulse": "neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gaming-glow": "gaming-glow 3s ease-in-out infinite alternate",
        "victory-bounce": "victory-bounce 0.6s ease-in-out",
        "battle-ready": "battle-ready 1s ease-in-out infinite",
        "match-live": "match-live 2s ease-in-out infinite",
        "floating": "floating 3s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        competitiveGlow: {
          "0%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.3)" },
          "100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.6)" },
        },
        victoryPulse: {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--success) / 0.4)" },
          "50%": { boxShadow: "0 0 25px hsl(var(--success) / 0.8)" },
        },
        defeatShake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "neon-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.1)",
          },
          "50%": {
            boxShadow: "0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.2)",
          },
        },
        "gaming-glow": {
          "0%": {
            textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))",
          },
          "100%": {
            textShadow: "0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary)), 0 0 40px hsl(var(--primary))",
          },
        },
        "victory-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "battle-ready": {
          "0%, 100%": { 
            transform: "scale(1)",
            boxShadow: "0 0 15px hsl(var(--primary) / 0.3)",
          },
          "50%": { 
            transform: "scale(1.05)",
            boxShadow: "0 0 25px hsl(var(--primary) / 0.5)",
          },
        },
        "match-live": {
          "0%, 100%": {
            borderColor: "hsl(120 60% 50% / 0.3)",
            boxShadow: "0 0 10px hsl(120 60% 50% / 0.2)",
          },
          "50%": {
            borderColor: "hsl(120 60% 50% / 0.8)",
            boxShadow: "0 0 20px hsl(120 60% 50% / 0.5)",
          },
        },
        "floating": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      textShadow: {
        'competitive': '0 0 10px hsl(var(--primary))',
        'glow': '0 0 10px hsl(var(--primary))',
        'glow-lg': '0 0 20px hsl(var(--primary))',
        'neon': '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))',
        'gaming': '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary))',
        'victory': '0 0 10px hsl(var(--success))',
        'defeat': '0 0 10px hsl(var(--destructive))',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '92': '23rem',
        '100': '25rem',
        '104': '26rem',
        '108': '27rem',
        '112': '28rem',
        '116': '29rem',
        '120': '30rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
        '98': '0.98',
        '97': '0.97',
      },
      letterSpacing: {
        'gaming': '0.1em',
        'ultra-wide': '0.2em',
      },
      lineHeight: {
        'gaming': '1.1',
        'tight': '1.15',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-competitive': {
          textShadow: '0 0 10px hsl(var(--primary))',
        },
        '.text-shadow-glow': {
          textShadow: '0 0 10px hsl(var(--primary))',
        },
        '.text-shadow-glow-lg': {
          textShadow: '0 0 20px hsl(var(--primary))',
        },
        '.text-shadow-neon': {
          textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))',
        },
        '.text-shadow-gaming': {
          textShadow: '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary))',
        },
        '.text-shadow-victory': {
          textShadow: '0 0 10px hsl(var(--success))',
        },
        '.text-shadow-defeat': {
          textShadow: '0 0 10px hsl(var(--destructive))',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.preserve-3d': {
          transformStyle: 'preserve-3d',
        },
        '.backface-hidden': {
          backfaceVisibility: 'hidden',
        },
        '.rotate-y-180': {
          transform: 'rotateY(180deg)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} 