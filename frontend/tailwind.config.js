// Defines the app theme and scoped voice controls.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#2563EB',
        },
        prescriptionPrimary: '#2563EB',
        prescriptionPrimaryDark: '#1D4ED8',
        voicePrimary: '#2563EB',
        voicePrimaryDark: '#1D4ED8',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: 'rgb(30 41 59 / 0.1)',
        textPrimary: '#1E293B',
        textSecondary: 'rgb(30 41 59 / 0.65)',
        success: '#2563EB',
        warning: '#2563EB',
        danger: '#DC2626',
      },
    },
  },
  plugins: [],
}
