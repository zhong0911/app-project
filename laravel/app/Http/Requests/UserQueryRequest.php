<?php
/**
 * 分页查询入参（对标 Spring Boot 的 dto/UserQueryDTO）。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** 唯一标识可能是数字形态（SSO uid），统一转字符串后再做精确匹配 */
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
            'pageNum' => ['sometimes', 'integer', 'min:1'],
            'pageSize' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'uid' => ['sometimes', 'string', 'max:64'],
            'role' => ['sometimes', 'string'],
            'status' => ['sometimes', 'integer', 'in:0,1'],
        ];
    }

    public function pageNum(): int
    {
        return max(1, (int) $this->input('pageNum', 1));
    }

    public function pageSize(): int
    {
        return min(500, max(1, (int) $this->input('pageSize', 10)));
    }
}
