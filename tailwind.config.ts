import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { fontFamily: { sans: ['Vazirmatn','Tahoma','Arial','sans-serif'] } } }, plugins: [] };
export default config;
