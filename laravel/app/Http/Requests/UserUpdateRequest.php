<?php
/**
 * 更新用户入参（对标 Spring Boot 的 dto/UserUpdateDTO）。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'integer', 'min:1'],
            'role' => ['required', 'string', Rule::in(['ADMIN', 'USER', 'admin', 'user'])],
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => '用户 ID 不能为空',
            'role.required' => '角色不能为空',
            'role.in' => '角色不合法，仅支持 ADMIN / USER',
        ];
    }
}
