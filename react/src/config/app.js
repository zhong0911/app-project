/** 应用级常量：标题等统一从环境变量读取，避免页面里散落占位文案 */
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || '图床'

/** 账号中心（SSO 用户中心）地址：登录后用户菜单里的「账号中心」跳这里 */
export const ACCOUNT_CENTER_URL = import.meta.env.VITE_ACCOUNT_CENTER_URL || 'https://passport.antx.cc'
