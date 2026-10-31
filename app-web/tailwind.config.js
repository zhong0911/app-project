/** @type {import('tailwindcss').Config} */
export default {
  // 暗色变体跟随 <html> 的 dark 类（与项目主题切换方案一致，而非系统偏好）
  darkMode: 'class',
  // 扫描 Vue 模板与 JS/TS 中的类名
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 可在此扩展主题（颜色、间距等），示例：
      // colors: { brand: '#1677ff' },
    },
  },
  corePlugins: {
    // 关闭 preflight，避免与 antdv-next 的 reset.css 冲突
    preflight: false,
  },
  plugins: [],
}
