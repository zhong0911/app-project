<?php
/**
 * 创建用户入参（对标 Spring Boot 的 dto/UserCreateDTO + @Valid）。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uid' => ['required', 'string', 'max:64'],
        ];
    }

    public function messages(): array
    {
        return [
            'uid.required' => 'SSO 用户 uid 不能为空',
            'uid.max' => 'uid 长度不能超过 64 个字符',
        ];
    }
}
