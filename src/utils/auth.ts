import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../db";
import { privateEnv } from "~/config/privateEnv";
import { sendEmail } from "~/services/email";

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password - NewsMonitor",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset your password</title>
            </head>
            <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#f9fafb;">
              <div style="max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#ffffff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                  <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Reset your password</h1>
                  <p style="margin:0 0 24px;color:#6b7280;">
                    Hi ${user.name || "there"}, we received a request to reset your password. Click the button below to choose a new password.
                  </p>
                  <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(to right,#dc2626,#ea580c);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;">
                    Reset Password
                  </a>
                  <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
                    If you didn't request this, you can safely ignore this email.
                  </p>
                  <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
                    This link will expire in 1 hour.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: privateEnv.GOOGLE_CLIENT_ID,
      clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
    },
  },
});
