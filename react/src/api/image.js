import request from '@/api/request'

/**
 * 图床接口（四个后端统一契约）
 *
 * 上传走 multipart（字段名 file），返回图片直链；同内容（sha256 相同）由后端自动去重，
 * 此时返回的 dedup=true，前端提示「同图已存在」即可。
 */
// key：同 key 的新请求会取消上一个（翻页/搜索连续点击时不出现旧响应覆盖新数据）
export function getImagesApi(params) {
  return request.get('/image', { params, key: 'images' })
}

export function getImageRecycleApi(params) {
  return request.get('/image/recycle', { params, key: 'image-recycle' })
}

/** 上传单张图片（FormData 含 file；不手写 Content-Type，交给浏览器补 boundary） */
export function uploadImageApi(formData) {
  return request.post('/image', formData, { timeout: 60000 })
}

/** 移入回收站（软删除） */
export function deleteImageApi(uuid) {
  return request.delete(`/image/${uuid}`)
}

/** 从回收站恢复 */
export function restoreImageApi(uuid) {
  return request.post(`/image/${uuid}/restore`)
}

/** 彻底删除（不可恢复，连同存储文件） */
export function purgeImageApi(uuid) {
  return request.delete(`/image/${uuid}/purge`)
}
