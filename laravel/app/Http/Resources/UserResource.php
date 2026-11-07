<?php
/**
 * 用户出参（对标 Spring Boot 的 vo/UserVO）。
 */

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'uid' => $this->uid,
            'role' => $this->role,
            'status' => (int) $this->status,
            'deleted' => (int) $this->deleted,
            'createTime' => optional($this->create_time)?->format('Y-m-d H:i:s'),
            'updateTime' => optional($this->update_time)?->format('Y-m-d H:i:s'),
        ];
    }
}
