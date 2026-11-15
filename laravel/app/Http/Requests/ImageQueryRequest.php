<?php
/**
 * 图片分页查询入参（对标 Spring Boot 的 dto/ImageQueryDTO）。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImageQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pageNum' => ['sometimes', 'integer', 'min:1'],
            'pageSize' => ['sometimes', 'integer', 'min:1', 'max:200'],
            'keyword' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    public function pageNum(): int
    {
        return max(1, (int) $this->input('pageNum', 1));
    }

    public function pageSize(): int
    {
        return min(200, max(1, (int) $this->input('pageSize', 10)));
    }

    public function keyword(): ?string
    {
        $keyword = $this->input('keyword');
        return is_string($keyword) && $keyword !== '' ? $keyword : null;
    }
}
