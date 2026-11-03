/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Primary — brand blue ramp, sampled from healthit.gov (ONC/USWDS). Single
         * source of truth is the --blue-* custom properties in src/index.css. */
        blue: {
          50: 'var(--blue-50)',
          100: 'var(--blue-100)',
          200: 'var(--blue-200)',
          300: 'var(--blue-300)',
          400: 'var(--blue-400)',
          500: 'var(--blue-500)',
          600: 'var(--blue-600)',
          700: 'var(--blue-700)',
          800: 'var(--blue-800)',
          900: 'var(--blue-900)',
          950: 'var(--blue-950)',
        },
        /* Alias so any remaining bg-navy-900 etc. keep working */
        navy: {
          50: 'var(--blue-50)',
          100: 'var(--blue-100)',
          200: 'var(--blue-200)',
          300: 'var(--blue-300)',
          400: 'var(--blue-400)',
          500: 'var(--blue-500)',
          600: 'var(--blue-600)',
          700: 'var(--blue-700)',
          800: 'var(--blue-800)',
          900: 'var(--blue-900)',
          950: 'var(--blue-950)',
        },
        /* Gold accents */
        gold: {
          DEFAULT: 'var(--gold)',
          line: 'var(--gold-line)',
          star: 'var(--gold-star)',
          text: 'var(--gold-text)',
        },
        body: 'var(--body)',
        surface: 'var(--surface)',
        /* Secondary — Lantern Sky */
        sky: {
          500: '#02bfe7',
          400: '#34d2f0',
          300: '#69e0f5',
          600: '#0095c8',
        },
        /* Status indicators */
        status: {
          green: 'var(--color-success)',
          'green-light': '#4aa564',
          'green-bg': '#e7f4e9',
          gold: 'var(--gold)',
          'gold-text': 'var(--gold-text-muted)',
          'gold-bg': '#fff3e0',
          red: 'var(--color-error)',
          'red-bg': '#fbe9ec',
          info: 'var(--color-secondary)',
        },
        /* HTTP response code colours */
        http: {
          '2xx': 'var(--color-success)',
          '2xx-bg': '#e7f4e9',
          '3xx': 'var(--blue-700)',
          '3xx-bg': 'var(--blue-100)',
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
