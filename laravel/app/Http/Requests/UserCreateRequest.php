<?php
/**
 * 创建用户入参（对标 Spring Boot 的 dto/UserCreateDTO + @Valid）。
 *
 * 只收一个「用户唯一标识」：SSO access_token 的 sub，可能是 uid（整数）、
 * username、email 或 phone，这里一律按字符串校验与落库。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** 客户端可能把纯数字标识当 JSON number 传过来，先统一转成字符串再校验 */
    protected function prepareForValidation(): void
    {
        $uid = $this->input('uid');

        if ($uid !== null && ! is_array($uid) && ! is_bool($uid)) {
            $this->merge(['uid' => trim((string) $uid)]);
        }
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
            'uid.required' => '用户唯一标识不能为空',
            'uid.max' => '用户唯一标识长度不能超过 64 个字符',
        ];
    }
}
