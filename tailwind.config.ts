import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: '#6757f5',
        'brand-light': '#8b7aff',
        'brand-dark': '#5a49e3',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config