/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Primary — Government Navy */
        navy: {
          950: '#0a1628',
          900: '#112e51',
          800: '#1a3a63',
          700: '#205493',
          600: '#2e6db4',
          500: '#4a90d9',
          400: '#4773aa',
          300: '#8ba6ca',
        },
        /* Secondary — Lantern Sky */
        sky: {
          500: '#02bfe7',
          400: '#34d2f0',
          300: '#69e0f5',
          600: '#0095c8',
        },
        /* Status indicators */
        status: {
          green: '#2e8540',
          'green-light': '#4aa564',
          'green-bg': '#e7f4e9',
          gold: '#fdb81e',
          'gold-bg': '#fff3e0',
          red: '#e31c3d',
          'red-bg': '#fbe9ec',
          info: '#02bfe7',
        },
        /* HTTP response code colours */
        http: {
          '2xx': '#2e8540',
          '2xx-bg': '#e7f4e9',
          '3xx': '#205493',
          '3xx-bg': '#e8f0f8',
          '4xx': '#b56a00',
          '4xx-bg': '#fff3e0',
          '5xx': '#b51b35',
          '5xx-bg': '#fbe9ec',
          timeout: '#5b616b',
          'timeout-bg': '#f1f1f1',
        },
        /* Neutral scale */
        neutral: {
          50: '#f9fafb',
          100: '#f1f1f1',
          200: '#d6d7d9',
          300: '#aeb0b5',
          400: '#8b95a5',
          500: '#5b616b',
          600: '#323a45',
          700: '#2d3239',
          800: '#212121',
          900: '#0d1117',
        },
      },
      fontFamily: {
        sans: [
          "'Source Sans 3'",
          "'Source Sans Pro'",
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          'sans-serif',
        ],
        serif: ["'Merriweather'", 'Georgia', 'serif'],
        mono: ["'Source Code Pro'", "'Courier New'", 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      maxWidth: {
        page: '1200px',
        narrow: '1200px',
      },
      minHeight: {
        screen: '100vh',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07)',
        elevated: '0 10px 25px rgba(0,0,0,0.1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
      },
    },
  },
  plugins: [],
};
