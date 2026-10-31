import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 按 mode 加载 .env 文件，env 变量可在下方配置中使用
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      vue(),
      // AntdvNext 页面级按需自动导入：模板中的 a-xxx 组件按需 import，
      // 不再需要全局注册（此前 registerAntd 会让全部组件进入主 chunk）
      Components({
        resolvers: [AntdvNextResolver()],
        // JS 项目不需要生成的组件类型声明文件
        dts: false,
      }),
    ],

    // 路径别名：@ 指向 src
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 3000,
      open: true,
      // 开发环境代理：将 /api 转发到后端服务
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 仅保留 vue 生态分包。antdv 不强制聚合：
          // 组件已由 unplugin 按页面自动导入，让 rollup 把共享组件放共享块、
          // 页面独有组件跟随各自路由 chunk，避免首屏全量加载整个组件库
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
          },
        },
      },
    },
  }
})
