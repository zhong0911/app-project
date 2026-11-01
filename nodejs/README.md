# AntX Node.js 后端模板（对标 Spring Boot 模板）

对标 `springboot`（Spring Boot 4）的统一规范，用 Node.js + Express 实现同一套后端骨架。

## 目录结构

```
nodejs/
├── package.json
├── src/
│   ├── app.js                  # 入口：Express 应用 + 路由挂载 + 全局异常处理
│   ├── api-response.js         # 统一响应体（对标 Result）
│   ├── paginated-data.js       # 分页封装（对标 PageResult）
│   ├── result-code.js          # 状态码（code 分段设计）
│   ├── business-exception.js   # 业务异常（对标 BusinessException）
│   ├── global-error-handler.js # 全局异常处理中间件
│   └── routes/
│       └── user.routes.js      # RESTful 用户示例（内存数据）
└── README.md
```

## 运行

```bash
npm install
npm run dev       # 开发（node --watch）
npm start         # 生产
```

## RESTful 接口（对标 UserController）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST   | `/api/users` | 创建用户（JSON body） |
| PUT    | `/api/users` | 更新用户（JSON body） |
| DELETE | `/api/users/{id}` | 删除用户 |
| GET    | `/api/users/{id}` | 用户详情 |
| GET    | `/api/users?pageNum=1&pageSize=10` | 分页列表 |

## 统一响应体（ApiResponse，对标 Result）

五字段，`data` 为 null 时省略（对标 `@JsonInclude(NON_NULL)`）：

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { "id": 1, "uid": "1", "role": "ADMIN" },
  "timestamp": 1720000000000
}
```

## 分页（PaginatedData，对标 PageResult）

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {
    "pageNum": 1,
    "pageSize": 10,
    "total": 42,
    "pages": 5,
    "records": [ ... ]
  },
  "timestamp": 1720000000000
}
```

## code 分段设计（ResultCode）

- **HTTP 语义段**：`200` 成功、`400` 参数、`401` 未认证、`403` 无权限、`404` 不存在、`405` 方法不支持、`500` 内部错误
- **业务码段（1000+，按模块递增）**：`1000` 业务异常、`1001` 数据冲突、`1002` 数据库错误、`1003` 文件错误

## 错误也统一返回

业务层抛 `BusinessException`，由 `global-error-handler.js` 捕获并转成统一五字段响应，不向前端暴露异常细节：

```js
throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
// -> { "code": 404, "success": false, "message": "用户不存在", "timestamp": ... }
```

接入数据库时，把 `routes/user.routes.js` 的内存 Map 替换为 ORM 仓储层即可，路由、响应、异常处理骨架无需改动。
