package cc.antx.template.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 发送邮件请求入参（DTO）。
 */
@Getter
@Setter
public class MailSendDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 收件人 */
    @NotBlank(message = "收件人不能为空")
    @Email(message = "收件人邮箱格式不正确")
    private String to;

    /** 主题 */
    @NotBlank(message = "邮件主题不能为空")
    @Size(max = 128, message = "主题长度不能超过 128 个字符")
    private String subject;

    /** 正文内容（支持纯文本或 HTML，取决于 isHtml） */
    @NotBlank(message = "邮件内容不能为空")
    private String content;

    /** 是否 HTML 格式（默认 false） */
    private Boolean isHtml = false;
}
