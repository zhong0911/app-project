/**
 * Drawer 滚动锁兜底
 *
 * antdv-next（@v-c/portal 的 useScrollLocker）打开抽屉时会注入
 * `html body { overflow-y: hidden; width: calc(100% - Npx) }`，
 * 实测关闭抽屉后这条规则并不总被撤销：页面滚轮失效、锚点看起来"跳不动"。
 * 这里在抽屉关闭后用内联样式顶掉残留规则（内联优先级高于该样式表），
 * 再次打开抽屉时清掉内联，让组件自己的锁重新生效。
 */

/** 抽屉打开：清掉上一次兜底留下的内联样式，让组件自带的滚动锁正常工作 */
export function restoreDrawerScrollLock() {
  document.body.style.removeProperty('overflow-y')
  document.body.style.removeProperty('width')
}

/** 抽屉关闭：若滚动仍被残留规则锁住，用内联样式解除 */
export function releaseDrawerScrollLock() {
  if (getComputedStyle(document.body).overflowY !== 'hidden') {
    return
  }
  document.body.style.overflowY = 'auto'
  document.body.style.width = '100%'
}
