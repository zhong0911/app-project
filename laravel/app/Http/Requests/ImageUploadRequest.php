<?php
/**
 * 图片上传入参（对标 Spring Boot 的 dto/ImageUploadDTO）。
 * 大小上限跟随 config/image.php 的 max_size 配置。
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImageUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Laravel 的 max 对文件是「KB」
        $maxKb = (int) ceil(((int) config('image.max_size', 10 * 1024 * 1024)) / 1024);

        return [
            'file' => ['required', 'file', 'max:'.$maxKb],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => '请选择要上传的图片',
            'file.file' => '上传内容不是有效文件，请重新选择',
            'file.max' => '图片体积超限，最大 '.round(((int) config('image.max_size', 10 * 1024 * 1024)) / 1048576, 1).' MB',
            'file.uploaded' => '图片上传失败，请检查 PHP upload_max_filesize / post_max_size 限制',
        ];
    }
}
