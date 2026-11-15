<?php
/**
 * BFF 出参（对标 Spring Boot 的 vo/BffUserVO）：面向前端的登录态视图。
 */

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BffUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'authType' => $this['authType'] ?? null,
            // 唯一标识一律输出字符串
            'uid' => isset($this['uid']) ? (string) $this['uid'] : null,
            'localId' => $this['localId'] ?? null,
            'role' => $this['role'] ?? null,
            'isAdmin' => $this['isAdmin'] ?? false,
            'status' => $this['status'] ?? null,
            'name' => $this['name'] ?? null,
        ];
    }
}
