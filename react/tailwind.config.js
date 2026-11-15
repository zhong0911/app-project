/** @type {import('tailwindcss').Config} */
export default {
  // 暗色模式由 <html> 的 dark 类控制（见 index.html 预置脚本与 App.jsx）
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
