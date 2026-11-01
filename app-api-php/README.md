# AntX PHP 后端模板（对标 Spring Boot 模板）

对标 `app-api`（Spring Boot 4）的统一规范，用原生 PHP 实现同一套后端骨架。**无第三方框架依赖**，内置 PHP 服务器即可运行。

## 目录结构

```
app-api-php/
├── public/
│   └── index.php          # 入口：前端控制器 + 极简路由 + 全局异常处理
├── src/
│   ├── ApiResponse.php    # 统一响应体（对标 Result）
│   ├── PaginatedData.php  # 分页封装（对标 PageResult）
│   ├── ResultCode.php     # 状态码枚举（code 分段设计）
│   ├── BusinessException.php
│   ├── GlobalExceptionHandler.php  # 全局异常处理器
│   └── UserController.php # RESTful 用户示例（内存数据）
├── composer.json
└── README.md
```

## 运行

```bash
# 方式一：PHP 内置服务器（推荐，无需依赖）
php -S 0.0.0.0:8080 public/index.php

# 方式二：Composer 脚本
composer serve
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

业务层抛 `BusinessException`，由 `GlobalExceptionHandler` 捕获并转成统一五字段响应，不向前端暴露异常细节：

```php
throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
// -> { "code": 404, "success": false, "message": "用户不存在", "timestamp": ... }
```

接入数据库时，把 `UserController` 的内存数组替换为 PDO/ORM 仓储层即可，路由、响应、异常处理骨架无需改动。
