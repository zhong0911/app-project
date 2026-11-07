import { config } from './config.js'

/**
 * AntX Passport SSO 客户端（OAuth2 授权码模式）
 * - 端点优先从 issuer 的 /.well-known/openid-configuration 发现，失败时回落到标准路径
 * - 仅使用 openid scope：用户资料通过 /userinfo 获取（passport 只声明 openid）
 */

let cached = null

function fallbackEndpoints() {
  const base = config.sso.issuer
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth2/authorize`,
    token_endpoint: `${base}/oauth2/token`,
    userinfo_endpoint: `${base}/userinfo`,
    revocation_endpoint: `${base}/oauth2/revoke`,
    end_session_endpoint: `${base}/connect/logout`,
  }
}

/** 从反向代理头推导对外地址（生成 redirect_uri 与退出回跳地址） */
export function publicBaseUrl(req) {
  if (config.publicHost) return config.publicHost
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim()
  return `${proto}://${host}`
}

export function callbackUri(req) {
  return config.sso.redirectUri || `${publicBaseUrl(req)}/sso/callback`
}

export function ssoEnabled() {
  return Boolean(config.sso.clientId && config.sso.clientSecret)
}

export function discover() {
  if (cached) return Promise.resolve(cached)
  return discoverRemote()
}

async function discoverRemote() {
  const fallback = fallbackEndpoints()
  try {
    const response = await fetch(`${config.sso.issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`discovery ${response.status}`)
    const doc = await response.json()
    cached = { ...fallback, ...doc }
  } catch {
    cached = fallback
  }
  return cached
}

function endpoint(name) {
  const explicit = {
    authorization: config.sso.authorizationUri,
    token: config.sso.tokenUri,
    userinfo: config.sso.userinfoUri,
    revocation: config.sso.revokeUri,
    end_session: config.sso.logoutUri,
  }[name]
  return explicit || ''
}

export async function buildAuthorizeUrl({ redirectUri, state }) {
  const doc = await discover()
  const target = endpoint('authorization') || doc.authorization_endpoint
  const url = new URL(target)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.sso.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', config.sso.scope)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeCode({ code, redirectUri }) {
  const doc = await discover()
  const target = endpoint('token') || doc.token_endpoint
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.sso.clientId,
    client_secret: config.sso.clientSecret,
  })
  const response = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()
  let payload = {}
  try {
    payload = JSON.parse(text)
  } catch {
    payload = Object.fromEntries(new URLSearchParams(text))
  }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `换取 token 失败（${response.status}）`)
  }
  return payload
}

export function decodeIdToken(idToken) {
  if (!idToken || idToken.split('.').length < 2) return {}
  try {
    const part = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(part, 'base64').toString('utf8'))
  } catch {
    return {}
  }
}

export async function fetchUserinfo(tokens) {
  const doc = await discover()
  const target = endpoint('userinfo') || doc.userinfo_endpoint
  try {
    const response = await fetch(target, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const body = await response.json()
      if (body && body.sub) return body
    }
  } catch {
    // 回落到 id_token 声明
  }
  return decodeIdToken(tokens.id_token)
}

export async function revokeToken(token) {
  const doc = await discover()
  const target = endpoint('revocation') || doc.revocation_endpoint
  if (!target || !token) return
  try {
    await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: config.sso.clientId, client_secret: config.sso.clientSecret }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // 撤销失败不影响本地退出
  }
}

export async function buildLogoutUrl({ idTokenHint, postLogoutRedirectUri }) {
  const doc = await discover()
  const target = endpoint('end_session') || doc.end_session_endpoint
  if (!target) return ''
  const url = new URL(target)
  url.searchParams.set('client_id', config.sso.clientId)
  if (postLogoutRedirectUri) url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
  if (idTokenHint) url.searchParams.set('id_token_hint', idTokenHint)
  return url.toString()
}
