/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366f1', // Electric Violet
                    foreground: '#ffffff',
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                secondary: {
                    DEFAULT: '#64748b', // Slate 500
                    foreground: '#ffffff',
                },
                accent: {
                    DEFAULT: '#fbbf24', // Vibrant Yellow
                    foreground: '#1f2937',
                    teal: '#2dd4bf',
                },
                background: '#fafafa', // Warm Gray / Cream
                surface: '#ffffff',
                foreground: '#0f172a', // Slate 900
                muted: {
                    DEFAULT: '#f1f5f9',
                    foreground: '#64748b',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px -5px rgba(99, 102, 241, 0.4)',
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            }
        },
    },
    plugins: [],
}
