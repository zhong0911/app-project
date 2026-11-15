<?php
/**
 * images 表（与 sql/init.sql 等价；生产建议直接用 init.sql 建表）。
 *
 * 以 uuid 作为图片直链的唯一标识，hash 用于同内容去重。
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('images', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('uuid', 32)->unique()->comment('图片直链标识');
            $table->string('origin_name', 255)->nullable()->comment('原始文件名');
            $table->string('ext', 16)->default('')->comment('扩展名（小写，不含点）');
            $table->string('mime_type', 64)->default('')->comment('按文件内容识别出的 MIME');
            $table->unsignedBigInteger('size')->default(0)->comment('字节大小');
            $table->string('hash', 64)->default('')->comment('sha256，用于同内容去重');
            $table->unsignedInteger('width')->nullable()->comment('像素宽');
            $table->unsignedInteger('height')->nullable()->comment('像素高');
            $table->string('storage_key', 512)->default('')->comment('存储对象 key');
            $table->string('uid', 64)->default('')->comment('上传者 SSO uid');
            $table->unsignedBigInteger('visit_count')->default(0)->comment('访问次数');
            $table->tinyInteger('deleted')->default(0)->comment('逻辑删除：0-正常，1-回收站');
            $table->integer('version')->default(1);
            $table->dateTime('create_time')->useCurrent();
            $table->dateTime('update_time')->useCurrent();
            $table->index(['deleted', 'create_time']);
            $table->index('uid');
            $table->index('hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('images');
    }
};
