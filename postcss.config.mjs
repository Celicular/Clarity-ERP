/**
 * PostCSS configuration
 * Uses Tailwind CSS v4's dedicated PostCSS plugin + Autoprefixer
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Tailwind CSS v4 PostCSS plugin
    autoprefixer: {},           // Add vendor prefixes automatically
  },
};

export default config;
