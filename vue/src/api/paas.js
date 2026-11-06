import request from '@/api/request'

/** 总览数据 */
export const getOverviewApi = () => request.get('/paas/overview')

/** 应用列表 */
export const getAppsApi = (params) => request.get('/paas/apps', { params })

/** 应用详情 */
export const getAppApi = (id) => request.get(`/paas/apps/${id}`)

/** 创建应用 */
export const createAppApi = (payload) => request.post('/paas/apps', payload)

/** 更新应用 */
export const updateAppApi = (id, payload) => request.put(`/paas/apps/${id}`, payload)

/** 删除应用 */
export const deleteAppApi = (id) => request.delete(`/paas/apps/${id}`)

/** 触发部署 */
export const deployAppApi = (id, payload = {}) => request.post(`/paas/apps/${id}/deploy`, payload)

/** 回滚到指定部署 */
export const rollbackAppApi = (id, deploymentId) =>
  request.post(`/paas/apps/${id}/rollback`, { deploymentId })

/** 启停 / 重启 */
export const appActionApi = (id, action) => request.post(`/paas/apps/${id}/actions`, { action })

/** 运行指标 */
export const getMetricsApi = (id) => request.get(`/paas/apps/${id}/metrics`)

/** 部署列表 */
export const getDeploymentsApi = (id) => request.get(`/paas/apps/${id}/deployments`)

/** 单次部署详情（含日志） */
export const getDeploymentApi = (id) => request.get(`/paas/deployments/${id}`)

/** 部署日志流地址（SSE） */
export const deploymentStreamUrl = (id) => `/api/paas/deployments/${id}/stream`

/** 应用运行日志流地址（SSE） */
export const appLogStreamUrl = (id, tail = 200) => `/api/paas/apps/${id}/logs?tail=${tail}`
