<?php
/**
 * 启停入参（对标 Spring Boot 的 UserStatusDTO）。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'integer', Rule::in([0, 1])],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => '状态仅支持 0-禁用 / 1-启用',
        ];
    }
}
