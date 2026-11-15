<?php
/**
 * 角色新增 / 更新入参（对标 Spring Boot 的 dto/RoleDTO + @Valid）。
 *
 * 编码统一大写，只允许字母、数字与下划线，便于包装成 ROLE_* 权限名。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** 前端可能传纯数字以外的空白字符，先 trim 再校验 */
    protected function prepareForValidation(): void
    {
        foreach (['code', 'name', 'description'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => trim($value)]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'regex:/^[A-Za-z][A-Za-z0-9_]{1,31}$/'],
            'name' => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'integer', 'in:0,1'],
            'sort' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => '角色编码不能为空',
            'code.regex' => '角色编码只允许字母、数字与下划线，长度 2-32',
            'name.required' => '角色名称不能为空',
            'name.max' => '角色名称长度不能超过 64',
            'description.max' => '角色描述长度不能超过 255',
            'status.in' => '状态仅支持 0-禁用 / 1-启用',
        ];
    }
}
