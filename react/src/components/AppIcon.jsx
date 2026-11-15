/**
 * 应用图标（Logo / Favicon 统一样式）
 *
 * 两种替换方式，二选一：
 * 1. 图片：把 imageUrl 填成图片地址（如 '/logo.png'、'https://.../logo.png'）
 * 2. 内联 SVG：imageUrl 留空，直接修改下面的 <svg> 代码
 */
export default function AppIcon({ imageUrl = '', size = 40, alt = '应用图标', className = '' }) {
  const style = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
  }
  const cls = className ? `app-icon ${className}` : 'app-icon'

  if (imageUrl) {
    return <img src={imageUrl} alt={alt} style={style} className={cls} />
  }

  // 默认内联 SVG：蓝色圆形 + 四宫格，与登录页、favicon 保持一致
  return (
    <svg
      style={style}
      className={cls}
      viewBox="0 0 48 48"
      role="img"
      aria-label={alt}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="24" fill="#4c8bf5" />
      <rect x="14" y="14" width="8" height="8" rx="2" fill="#ffffff" />
      <rect x="26" y="14" width="8" height="8" rx="2" fill="#ffffff" />
      <rect x="14" y="26" width="8" height="8" rx="2" fill="#ffffff" />
      <rect x="26" y="26" width="8" height="8" rx="2" fill="#ffffff" />
    </svg>
  )
}
