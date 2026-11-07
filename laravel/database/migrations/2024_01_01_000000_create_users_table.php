<?php
/**
 * users 表（与 sql/init.sql 等价；生产建议直接用 init.sql 建表）。
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('uid', 64)->unique();
            $table->string('role', 20)->default('USER');
            $table->tinyInteger('status')->default(1);
            $table->tinyInteger('deleted')->default(0);
            $table->integer('version')->default(1);
            $table->dateTime('create_time')->useCurrent();
            $table->dateTime('update_time')->useCurrent();
            $table->index(['deleted', 'create_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
