import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';

import { Env } from '@/env';

import { InjectMailerTransporter } from './mailer.decorator';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly config: ConfigService<Env>,
    @InjectMailerTransporter()
    private readonly transport: Transporter,
  ) {}

  async sendConfirmationEmail(
    name: string,
    email: string,
    token: string,
  ): Promise<void> {
    const url = this.config
      .get<string>('WEBAPP_EMAIL_CONFIRM_URL')
      .replace('{token}', encodeURIComponent(token))
      .replace('{email}', encodeURIComponent(email));
    const subject = `【SystemQA】メールアドレスの確認をお願いします`;
    const message = `${name} 様<br /><br />
この度は、SystemQAにご登録いただきありがとうございます。<br />
新規登録はまだ完了していません。以下のリンクをクリックして、メールアドレスの確認を完了してください。<br /><br />
<hr /><br />
<a href="${url}" target="_blank">${url}</a>
<br /><br />
※URLの有効期限は24時間です。期限が切れた場合は、再度新規登録の手続きを行なってください。<br />
※もしこのメールが迷惑メールフォルダに振り分けられている場合は、迷惑メールフォルダをご確認いただき、迷惑メールでないことを設定してください。<br /><br />
<hr /><br />
もしこのメールに心当たりがない場合、またはご不明な点がございましたら、お気軽にお問い合わせください。<br />
今後とも、SystemQAをよろしくお願いいたします。<br />
お問い合わせ先：<a href="mailto:toji@in-sane.jp">toji@in-sane.jp</a><br /><br />
<hr /><br />
©️ 2024 株式会社inSane. All rights reserved.`;

    try {
      await this.transport.sendMail({
        from: this.config.get('MAIL_FROM_EMAIL'),
        to: `${email}`,
        subject,
        html: message,
      });
    } catch (err) {
      this.logger.error(err);
    }
  }

  async sendForgotPasswordEmail(
    name: string,
    email: string,
    token: string,
  ): Promise<void> {
    const url = this.config
      .get<string>('WEBAPP_FORGOT_PASSWORD_URL')
      .replace('{token}', encodeURIComponent(token))
      .replace('{email}', encodeURIComponent(email));
    const subject = `【SystemQA】パスワード再設定のご案内`;
    const message = `${name} 様<br /><br />
SystemQAをご利用いただきありがとうございます。<br />
パスワード再設定の依頼を受け付けました。以下のリンクをクリックして、新しいパスワードを設定してください。<br /><br />
<hr /><br />
<a href="${url}" target="_blank">${url}</a>
<br /><br />
※URLの有効期限は24時間です。期限が切れた場合は、再度パスワード再発行の手続きを行なってください。<br />
※もしこのメールが迷惑メールフォルダに振り分けられている場合は、迷惑メールフォルダをご確認いただき、迷惑メールでないことを設定してください。<br /><br />
<hr /><br />
もしこのメールに心当たりがない場合、またはご不明な点がございましたら、お気軽にお問い合わせください。<br />
今後とも、SystemQAをよろしくお願いいたします。<br />
お問い合わせ先：<a href="mailto:toji@in-sane.jp">toji@in-sane.jp</a><br /><br />
<hr />
©️ 2024 株式会社inSane. All rights reserved.`;

    try {
      await this.transport.sendMail({
        from: this.config.get('MAIL_FROM_EMAIL'),
        to: `${email}`,
        subject,
        html: message,
      });
    } catch (err) {
      this.logger.error(err);
    }
  }

  async sendInviteEmail(email: string, token: string): Promise<void> {
    const url = this.config
      .get<string>('WEBAPP_INVITATION_REGISTER_URL')
      .replace('{token}', encodeURIComponent(token))
      .replace('{email}', encodeURIComponent(email));

    const subject = `【SystemQA】招待メールが届きました`;
    const message = `管理者からSystemQAに招待されました。<br />
以下のリンクをクリックして、新規登録を完了してください。<br /><br />
<hr /><br />
<a href="${url}" target="_blank">${url}</a>
<br /><br />
※もしこのメールが迷惑メールフォルダに振り分けられている場合は、迷惑メールフォルダをご確認いただき、迷惑メールでないことを設定してください。
<br /><br /><hr /><br />
もしこのメールに心当たりがない場合、またはご不明な点がございましたら、お気軽にお問い合わせください。
今後とも、SystemQAをよろしくお願いいたします。
お問い合わせ先：<a href="mailto:toji@in-sane.jp">toji@in-sane.jp</a>
<br /><br /><hr /><br />
©️ 2024 株式会社inSane. All rights reserved.`;

    try {
      await this.transport.sendMail({
        from: this.config.get('MAIL_FROM_EMAIL'),
        to: `${email}`,
        subject,
        html: message,
      });
    } catch (err) {
      this.logger.error(err);
    }
  }
}
