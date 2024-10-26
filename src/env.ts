import { z } from 'zod';

export const EnvSchema = z
  .object({
    PORT: z.coerce.number().optional().default(3000),
    HOST: z.string().ip().default('0.0.0.0'),
    SWAGGER_ENABLED: z.coerce.boolean().default(false),

    JWT_SECRET_KEY: z.string().default('##secret@@'),
    JWT_EXPIRES_IN: z.string().default('1d'),

    MAIL_TRANSPORTER: z.enum(['aws_ses', 'smtp']).default('smtp'),
    MAIL_SMTP_HOST: z.string().optional(),
    MAIL_SMTP_PORT: z.coerce.number().optional(),
    MAIL_SMTP_USERNAME: z.string().optional(),
    MAIL_SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM_EMAIL: z
      .string()
      .email()
      .optional()
      .default('noreply@example.com'),

    WEBAPP_BASE_URL: z.string().optional().default('http://127.0.0.1:3000'),
    WEBAPP_EMAIL_CONFIRM_URL: z
      .string()
      .url()
      .default(() => {
        return new URL(
          '/register/confirmation?token={token}&email={email}',
          process.env.WEBAPP_BASE_URL || 'http://127.0.0.1:3000',
        ).toString();
      }),
    WEBAPP_FORGOT_PASSWORD_URL: z
      .string()
      .url()
      .default(() => {
        return new URL(
          '/forgot-password/reset?token={token}&email={email}',
          process.env.WEBAPP_BASE_URL || 'http://127.0.0.1:3000',
        ).toString();
      }),
    WEBAPP_INVITATION_REGISTER_URL: z
      .string()
      .url()
      .default(() => {
        return new URL(
          '/register?token={token}&email={email}',
          process.env.WEBAPP_BASE_URL || 'http://127.0.0.1:3000/',
        ).toString();
      }),
    WEBAPP_MANUAL_PUBLIC_URL: z
      .string()
      .url()
      .default(() => {
        return new URL(
          '/manual-preview/{id}/detail',
          process.env.WEBAPP_BASE_URL || 'http://127.0.0.1:3000/',
        ).toString();
      }),

    MANUAL_FILES_S3_BUCKET_NAME: z.string(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().default('ap-northeast-1'),
    AWS_SQS_ACCOUNT_NUMBER: z.string(),
    AWS_SQS_ENDPOINT: z.string(),
    AWS_SQS_QUEUE_NAME: z.string(),

    GOOGLE_GEMINI_API_KEY: z.string(),
    GOOGLE_GEMINI_MODEL_NAME: z.string().optional().default('gemini-1.5-pro'),
  })
  .readonly();

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
