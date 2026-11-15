<?php
/**
 * 用户唯一标识工具（access_token 的 sub）。
 *
 * SSO 应用可以把唯一标识配置成 uid（整数）/ username / email / phone 等任意形态，
 * 所以子应用不假设它是数字：一律规范化成字符串再落库（users.uid 是 VARCHAR(64)）。
 */

namespace App\Support;

final class UserIdentity
{
    /** users.uid 列宽，落库前按此校验，超长会插入失败或被数据库截断 */
    public const MAX_LENGTH = 64;

    /**
     * 把 sub 规范化为字符串：int / float / string 都收，去掉首尾空白，空值返回 null。
     * 数组、布尔这类明显非法的取值直接判为无效。
     */
    public static function normalize(mixed $subject): ?string
    {
        if ($subject === null || is_array($subject) || is_bool($subject)) {
            return null;
        }

        // JSON 里的 1.0 会被解析成 float，先收回整数形态，避免落库变成 "1.0"
        if (is_float($subject) && (float) (int) $subject === $subject) {
            $subject = (int) $subject;
        }

        $value = trim((string) $subject);

        return $value === '' ? null : $value;
    }

    /** 规范化后仍为空时返回空字符串，便于调用方直接做 null 判断 */
    public static function orEmpty(mixed $subject): string
    {
        return self::normalize($subject) ?? '';
    }

    /** 是否落在 users.uid 列宽之内 */
    public static function fits(string $value): bool
    {
        return mb_strlen($value) <= self::MAX_LENGTH;
    }
}
