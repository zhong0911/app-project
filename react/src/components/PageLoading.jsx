import { Flex, Spin } from 'antd'

/**
 * 路由懒加载 / 登录态拉取中的占位
 * 居中显示（与项目约定一致：加载态一律水平垂直居中）
 */
export default function PageLoading({ height = '40vh' }) {
  return (
    <Flex align="center" justify="center" style={{ minHeight: height, width: '100%' }}>
      <Spin />
    </Flex>
  )
}
