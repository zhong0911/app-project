package cc.antx.template.controller;

import cc.antx.template.common.result.Result;
import cc.antx.template.dto.MailSendDTO;
import cc.antx.template.service.MailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 邮件接口（仅测试/内部使用示例）。
 *
 * <p><b>安全提示：</b>公开可调的任意邮件发送接口有被滥用作垃圾邮件/轰炸的风险，
 * 生产环境必须叠加鉴权（JWT/权限校验）或仅限内网调用，建议配合验证码/频率限制。</p>
 */
@Validated
@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    /** 发送邮件（POST + JSON body，长文本走 JSON） */
    @PostMapping("/send")
    public Result<Void> send(@Valid @RequestBody MailSendDTO dto) {
        mailService.sendSimpleMail(dto);
        return Result.success();
    }

    /** 发送 HTML 邮件 */
    @PostMapping("/send/html")
    public Result<Void> sendHtml(@Valid @RequestBody MailSendDTO dto) {
        mailService.sendHtmlMail(dto);
        return Result.success();
    }
}
