import type { Config } from 'tailwindcss'

/**
 * Design tokens extracted from the designer handoff (SharedComponents.jsx).
 * See: notes/2026-04-25-design-handoff.md in the project vault.
 *
 * Direction: "Cormorant Garamond + DM Sans, off-white quente, ouro-taupe.
 *            Atemporal, aconchegante, feminino sem ser infantil."
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: '#faf7f3',
        surface: {
          DEFAULT: '#ffffff',
          2: '#f5f0ea',
          3: '#ede6dc',
        },
        // Text
        ink: {
          DEFAULT: '#1e1a17',
          2: '#6d6460',
          3: '#b0a59d',
        },
        // Brand accent (ouro-taupe)
        accent: {
          DEFAULT: '#b8956a',
          dark: '#8b6840',
          light: '#f2e8d8',
        },
        // Borders
        border: {
          DEFAULT: '#e6dfd6',
          2: '#d4cbc0',
        },
        // Semantic
        success: {
          DEFAULT: '#6b9b78',
          light: '#e8f3eb',
        },
        danger: {
          DEFAULT: '#c47a7a',
          light: '#f7ebeb',
        },
        warning: {
          DEFAULT: '#c49a5a',
          light: '#faf0e0',
        },
      },
      fontFamily: {
        serif: ['var(--font-bodoni)', 'Didot', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.01em',
        snug: '-0.005em',
        wider: '0.04em',
        widest: '0.06em',
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.18)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
        bounce: 'bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
