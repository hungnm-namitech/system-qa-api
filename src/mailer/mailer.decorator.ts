import { Inject } from '@nestjs/common';

import { EMAIL_TRANSPORTER } from './mailer.const';

export const InjectMailerTransporter = () => Inject(EMAIL_TRANSPORTER);
