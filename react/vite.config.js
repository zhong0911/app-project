import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 按 mode 加载 .env 文件，env 变量可在下方配置中使用
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react()],

    // 路径别名：@ 指向 src
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      host: '0.0.0.0',
      // 与 vue 模板（3000）错开，两个模板可同时运行
      port: 3001,
      open: true,
      // 开发环境代理：将 /api 与 /sso（SSO 登录入口）转发到后端服务
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
        // OAuth2 客户端规范路径：/sso/authorize、/sso/callback
        '/sso': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },

    // 预览服务（npm run preview）同样绑定 0.0.0.0，方便局域网或容器访问
    preview: {
      host: '0.0.0.0',
      port: 3001,
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // React 生态单独分包；antd 交给 rollup 自动拆分，
          // 页面独有组件跟随各自路由 chunk，避免首屏全量加载组件库
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  }
})
