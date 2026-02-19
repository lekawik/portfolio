module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'media',
  theme: {
    extend: {
      backdropBlur: {
        custom: '16px',
      },
      fontSize: {
        'title1': '28px',
        "title2": "22px",
        "title3": "20px",
        "body": "17px",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: {
              fontSize: theme('fontSize.title1'),
            },
            h2: {
              fontSize: theme('fontSize.title2'),
            },
            h3: {
              fontSize: theme('fontSize.title3'),
            },
            p: {
              fontSize: theme('fontSize.body'),
            }
          }
        }
      }),
      colors: {
        'accent': {
          DEFAULT: 'rgba(88, 86, 214, 1)',
          dark: 'rgba(94, 92, 230, 1)'
        },
        'background-primary': {
          DEFAULT: 'rgba(255, 255, 255, 1)',
          dark: 'rgba(0, 0, 0, 1)'
        },
        'background-secondary': {
          DEFAULT: 'rgba(242, 242, 247, 1)',
          dark: 'rgba(28, 28, 30, 1)'
        },
        'primary-text': {
          DEFAULT: 'rgba(0, 0, 0, 1)',
          dark: 'rgba(255, 255, 255, 1)'
        },
        'secondary-text': {
          DEFAULT: 'rgba(60, 60, 67, 0.6)',
          dark: 'rgba(235, 235, 245, 0.6)'
        },
        'gray': {
          DEFAULT: 'rgba(142, 142, 147, 1)',
          dark: 'rgba(142, 142, 147, 1)'
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    function ({ addUtilities }) {
      addUtilities({
        '.header-blur': {
          '--tw-saturate': 'saturate(2)',
          backdropFilter:
            'blur(16px) saturate(2)',
          WebkitBackdropFilter: 'blur(16px) saturate(2)',
        },
      });
    },
  ],
};