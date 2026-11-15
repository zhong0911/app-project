import { Flex, Spin } from 'antd'

/**
 * 路由懒加载 / 登录态拉取中的占位
 * 居中显示（与项目约定一致：加载态一律水平垂直居中）
 *
 * 不传 height 时铺满可见视口（样式里用 100vh + 100svh 双声明，
 * 移动端不会被浏览器工具栏遮挡）；传 height 则按给定值作为最小高度。
 */
export default function PageLoading({ height }) {
  return (
    <Flex
      align="center"
      justify="center"
      className={`page-loading${height ? '' : ' page-loading-full'}`}
      style={height ? { minHeight: height } : undefined}
    >
      <Spin />
    </Flex>
  )
}
