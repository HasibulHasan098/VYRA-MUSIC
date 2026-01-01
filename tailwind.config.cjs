/** @type {import('tailwindcss').Config} */
// Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Fibonacci-based spacing (in pixels, converted to rem)
      spacing: {
        'fib-1': '0.0625rem',   // 1px
        'fib-2': '0.125rem',    // 2px
        'fib-3': '0.1875rem',   // 3px
        'fib-5': '0.3125rem',   // 5px
        'fib-8': '0.5rem',      // 8px
        'fib-13': '0.8125rem',  // 13px
        'fib-21': '1.3125rem',  // 21px
        'fib-34': '2.125rem',   // 34px
        'fib-55': '3.4375rem',  // 55px
        'fib-89': '5.5625rem',  // 89px
        'fib-144': '9rem',      // 144px
        'fib-233': '14.5625rem', // 233px
        'fib-377': '23.5625rem', // 377px
      },
      // Fibonacci-based font sizes
      fontSize: {
        'fib-8': '0.5rem',
        'fib-13': '0.8125rem',
        'fib-21': '1.3125rem',
        'fib-34': '2.125rem',
        'fib-55': '3.4375rem',
      },
      // Fibonacci-based border radius (iOS style)
      borderRadius: {
        'fib-3': '3px',
        'fib-5': '5px',
        'fib-8': '8px',
        'fib-13': '13px',
        'fib-21': '21px',
        'fib-34': '34px',
      },
      // iOS-inspired colors
      colors: {
        ios: {
          bg: '#F2F2F7',
          'bg-dark': '#000000',
          card: '#FFFFFF',
          'card-dark': '#1C1C1E',
          'card-secondary': '#F2F2F7',
          'card-secondary-dark': '#2C2C2E',
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          pink: '#FF2D55',
          gray: '#8E8E93',
          'gray-2': '#AEAEB2',
          'gray-3': '#C7C7CC',
          'gray-4': '#D1D1D6',
          'gray-5': '#E5E5EA',
          'gray-6': '#F2F2F7',
          separator: 'rgba(60, 60, 67, 0.36)',
          'separator-dark': 'rgba(84, 84, 88, 0.65)',
        }
      },
      // iOS-style backdrop blur
      backdropBlur: {
        ios: '20px',
      },
      // iOS-style shadows
      boxShadow: {
        'ios': '0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04)',
        'ios-lg': '0 8px 34px rgba(0, 0, 0, 0.15)',
      },
      // Fibonacci-based animation durations
      transitionDuration: {
        'fib-89': '89ms',
        'fib-144': '144ms',
        'fib-233': '233ms',
        'fib-377': '377ms',
      }
    },
  },
  plugins: [],
}
