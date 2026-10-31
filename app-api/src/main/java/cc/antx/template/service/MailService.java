package cc.antx.template.service;

import cc.antx.template.dto.MailSendDTO;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.File;

/**
 * 邮件发送服务。
 *
 * <p>支持：纯文本 / HTML / 带附件。SMTP 账号从 .env 读取（{@code spring.mail.username}）。</p>
 */
@Slf4j
@Service
public class MailService {

    private final JavaMailSender mailSender;

    /** 发件人（取自 spring.mail.username） */
    @Value("${spring.mail.username}")
    private String from;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** 发送纯文本邮件 */
    public void sendSimpleMail(MailSendDTO dto) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(dto.getTo());
        message.setSubject(dto.getSubject());
        message.setText(dto.getContent());
        mailSender.send(message);
        log.info("已发送纯文本邮件至: {}, 主题: {}", dto.getTo(), dto.getSubject());
    }

    /** 发送 HTML 邮件 */
    public void sendHtmlMail(MailSendDTO dto) {
        sendMime(dto, null);
        log.info("已发送 HTML 邮件至: {}, 主题: {}", dto.getTo(), dto.getSubject());
    }

    /** 发送带附件的邮件（可同时指定 HTML） */
    public void sendAttachmentMail(MailSendDTO dto, String... attachmentPaths) {
        sendMime(dto, attachmentPaths);
        log.info("已发送附件邮件至: {}, 附件数: {}", dto.getTo(), attachmentPaths.length);
    }

    /**
     * 统一发送 MIME 邮件（HTML 或带附件）。
     */
    private void sendMime(MailSendDTO dto, String[] attachmentPaths) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, attachmentPaths != null, "UTF-8");
            helper.setFrom(from);
            helper.setTo(dto.getTo());
            helper.setSubject(dto.getSubject());
            // isHtml 为 true 时按 HTML 渲染
            boolean html = Boolean.TRUE.equals(dto.getIsHtml());
            helper.setText(dto.getContent(), html);

            if (attachmentPaths != null) {
                for (String path : attachmentPaths) {
                    if (StringUtils.hasText(path)) {
                        File file = new File(path);
                        FileSystemResource resource = new FileSystemResource(file);
                        helper.addAttachment(file.getName(), resource);
                    }
                }
            }
            mailSender.send(message);
        } catch (Exception e) {
            throw new IllegalStateException("邮件发送失败: " + e.getMessage(), e);
        }
    }
}
