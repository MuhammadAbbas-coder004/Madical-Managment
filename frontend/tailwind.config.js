// Design-system theme — blue primary · navy text · light-gray bg · white cards.
// No pink or purple anywhere.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ── Typography ─────────────────────────────────── */
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },

      /* ── Color palette ──────────────────────────────── */
      colors: {
        // Primary — lime accent
        primary: {
          50: '#F7FFD9', 100: '#F1FFC2', 200: '#E8FF9E',
          300: '#DFFF7A', 400: '#D9FF5B', 500: '#D9FF5B',
          600: '#D9FF5B', DEFAULT: '#D9FF5B', 700: '#C5EA43',
          hover: '#C5EA43', 800: '#A7C932', 900: '#829E25', 950: '#536519',
        },

        // Backgrounds
        background: '#DEDEDE',
        surface:    '#FFFFFF',   // white cards

        // Borders
        border: '#E6E6E6',

        // Text — navy family
        textPrimary:   '#111111',
        textSecondary: '#6B6B6B',
        textMuted:     '#6B6B6B',

        // Semantic states
        success: '#15803D',
        warning: '#B45309',
        danger:  '#B91C1C',
        info:    '#6B6B6B',
      },

      /* ── Border-radius — large / soft ───────────────── */
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },

      /* ── Box-shadow — soft, layered ─────────────────── */
      boxShadow: {
        sm:   '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        md:   '0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        lg:   '0 10px 15px -3px rgb(15 23 42 / 0.06), 0 4px 6px -4px rgb(15 23 42 / 0.04)',
        xl:   '0 20px 25px -5px rgb(15 23 42 / 0.06), 0 8px 10px -6px rgb(15 23 42 / 0.04)',
        card: '0 1px 3px 0 rgb(15 23 42 / 0.04), 0 1px 2px -1px rgb(15 23 42 / 0.03)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
      },
    },
  },
  plugins: [],
}
