/** 统一返回体：与 vue 模板 request.js 的 { code, data, message } 约定一致 */
export function ok(res, data = null, message = 'ok') {
  return res.json({ code: 200, data, message })
}

export function fail(res, status, message, code = status) {
  return res.status(status).json({ code, data: null, message })
}

/** 业务异常：抛出后由全局错误处理转成统一返回体 */
export class BusinessError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

export function parseCookies(req) {
  const header = req.headers.cookie || ''
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}
