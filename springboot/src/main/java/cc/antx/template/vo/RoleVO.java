package cc.antx.template.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 角色响应出参（VO）。
 */
@Getter
@Setter
public class RoleVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 角色 ID */
    private Long id;

    /** 角色编码（ADMIN / USER …） */
    private String code;

    /** 角色名称 */
    private String name;

    /** 角色描述 */
    private String description;

    /** 内置角色：1-内置（不可删除） */
    private Integer builtIn;

    /** 状态：1-启用，0-禁用 */
    private Integer status;

    /** 排序 */
    private Integer sort;

    /** 创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /** 更新时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
