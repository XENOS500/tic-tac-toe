/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#060813',
          900: '#0b0f1f',
          850: '#11172f',
          800: '#161f3e',
          700: '#1f2b56',
        },
        neon: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          magenta: '#f72585',
          purple: '#7209b7',
          green: '#05ffa1',
          amber: '#ffb703',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
