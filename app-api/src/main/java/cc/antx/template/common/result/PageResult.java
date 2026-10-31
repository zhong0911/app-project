package cc.antx.template.common.result;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collections;
import java.util.List;

/**
 * 分页数据封装，作为统一响应 {@link Result#data} 的载体。
 *
 * @param <T> 列表元素类型
 */
@Getter
@Setter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageResult<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 当前页码（从 1 开始） */
    private long pageNum;

    /** 每页条数 */
    private long pageSize;

    /** 总条数 */
    private long total;

    /** 总页数 */
    private long pages;

    /** 当前页数据 */
    private List<T> records;

    public PageResult(long pageNum, long pageSize, long total, List<T> records) {
        this.pageNum = pageNum;
        this.pageSize = pageSize;
        this.total = total;
        this.records = records == null ? Collections.emptyList() : records;
        this.pages = pageSize == 0 ? 0 : (total + pageSize - 1) / pageSize;
    }

    /**
     * 由 MyBatis-Plus 分页对象转换而来。
     */
    public static <T> PageResult<T> of(IPage<T> page) {
        return new PageResult<>(page.getCurrent(), page.getSize(), page.getTotal(), page.getRecords());
    }
}
