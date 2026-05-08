import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "MangaZen <onboarding@resend.dev>";
const APP_NAME = "MangaZen";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  locale,
}: {
  to: string;
  resetUrl: string;
  locale: string;
}): Promise<void> {
  const isSpanish = locale.startsWith("es");
  const isPortuguese = locale.startsWith("pt");
  const isJapanese = locale === "ja-jp";
  const isKorean = locale === "ko-kr";
  const isChinese = locale === "zh-cn";
  const isRussian = locale === "ru-ru";

  let subject: string;
  let heading: string;
  let body: string;
  let buttonText: string;
  let expiry: string;
  let ignore: string;

  if (isSpanish) {
    subject = `Restablecer contraseña — ${APP_NAME}`;
    heading = "Restablecé tu contraseña";
    body = "Recibimos una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el botón de abajo para crear una nueva contraseña.";
    buttonText = "Restablecer contraseña";
    expiry = "Este enlace expira en 1 hora.";
    ignore = "Si no solicitaste esto, podés ignorar este email.";
  } else if (isPortuguese) {
    subject = `Redefinir senha — ${APP_NAME}`;
    heading = "Redefina sua senha";
    body = "Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.";
    buttonText = "Redefinir senha";
    expiry = "Este link expira em 1 hora.";
    ignore = "Se você não solicitou isso, pode ignorar este e-mail.";
  } else if (isJapanese) {
    subject = `パスワードのリセット — ${APP_NAME}`;
    heading = "パスワードをリセット";
    body = "アカウントのパスワードリセットのリクエストを受け付けました。下のボタンをクリックして新しいパスワードを設定してください。";
    buttonText = "パスワードをリセット";
    expiry = "このリンクは1時間で期限切れになります。";
    ignore = "心当たりがない場合は、このメールを無視してください。";
  } else if (isKorean) {
    subject = `비밀번호 재설정 — ${APP_NAME}`;
    heading = "비밀번호 재설정";
    body = "계정 비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.";
    buttonText = "비밀번호 재설정";
    expiry = "이 링크는 1시간 후에 만료됩니다.";
    ignore = "요청하지 않으셨다면 이 이메일을 무시하세요.";
  } else if (isChinese) {
    subject = `重置密码 — ${APP_NAME}`;
    heading = "重置您的密码";
    body = "我们收到了重置您账户密码的请求。点击下方按钮设置新密码。";
    buttonText = "重置密码";
    expiry = "此链接将在1小时后失效。";
    ignore = "如果您没有发起此请求，请忽略此邮件。";
  } else if (isRussian) {
    subject = `Сброс пароля — ${APP_NAME}`;
    heading = "Сбросьте ваш пароль";
    body = "Мы получили запрос на сброс пароля вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль.";
    buttonText = "Сбросить пароль";
    expiry = "Ссылка действительна в течение 1 часа.";
    ignore = "Если вы не запрашивали это, просто проигнорируйте письмо.";
  } else {
    subject = `Reset your password — ${APP_NAME}`;
    heading = "Reset your password";
    body = "We received a request to reset the password for your account. Click the button below to create a new password.";
    buttonText = "Reset password";
    expiry = "This link expires in 1 hour.";
    ignore = "If you didn't request this, you can ignore this email.";
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html: buildEmailHtml({ heading, body, buttonText, buttonUrl: resetUrl, expiry, ignore }),
  });
}

export async function sendSecurityCodeEmail({
  to,
  code,
  locale,
}: {
  to: string;
  code: string;
  locale: string;
}): Promise<void> {
  const isSpanish = locale.startsWith("es");
  const isPortuguese = locale.startsWith("pt");
  const isJapanese = locale === "ja-jp";
  const isKorean = locale === "ko-kr";
  const isChinese = locale === "zh-cn";
  const isRussian = locale === "ru-ru";

  let subject: string;
  let heading: string;
  let body: string;
  let expiry: string;
  let ignore: string;

  if (isSpanish) {
    subject = `Tu código de verificación — ${APP_NAME}`;
    heading = "Código de verificación";
    body = `Tu código de verificación es:`;
    expiry = "Este código expira en 10 minutos.";
    ignore = "Si no solicitaste esto, alguien puede estar intentando acceder a tu cuenta.";
  } else if (isPortuguese) {
    subject = `Seu código de verificação — ${APP_NAME}`;
    heading = "Código de verificação";
    body = `Seu código de verificação é:`;
    expiry = "Este código expira em 10 minutos.";
    ignore = "Se você não solicitou isso, alguém pode estar tentando acessar sua conta.";
  } else if (isJapanese) {
    subject = `認証コード — ${APP_NAME}`;
    heading = "認証コード";
    body = `あなたの認証コードは：`;
    expiry = "このコードは10分で期限切れになります。";
    ignore = "心当たりがない場合は、アカウントのセキュリティを確認してください。";
  } else if (isKorean) {
    subject = `인증 코드 — ${APP_NAME}`;
    heading = "인증 코드";
    body = `인증 코드는 다음과 같습니다:`;
    expiry = "이 코드는 10분 후에 만료됩니다.";
    ignore = "요청하지 않으셨다면 계정 보안을 확인하세요.";
  } else if (isChinese) {
    subject = `验证码 — ${APP_NAME}`;
    heading = "验证码";
    body = `您的验证码是：`;
    expiry = "此验证码将在10分钟后失效。";
    ignore = "如果您没有发起此请求，请检查您的账户安全。";
  } else if (isRussian) {
    subject = `Код подтверждения — ${APP_NAME}`;
    heading = "Код подтверждения";
    body = `Ваш код подтверждения:`;
    expiry = "Код действителен в течение 10 минут.";
    ignore = "Если вы не запрашивали это, проверьте безопасность аккаунта.";
  } else {
    subject = `Your verification code — ${APP_NAME}`;
    heading = "Verification code";
    body = `Your verification code is:`;
    expiry = "This code expires in 10 minutes.";
    ignore = "If you didn't request this, someone may be trying to access your account.";
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html: buildSecurityCodeHtml({ heading, body, code, expiry, ignore }),
  });
}

function buildEmailHtml({
  heading,
  body,
  buttonText,
  buttonUrl,
  expiry,
  ignore,
}: {
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  expiry: string;
  ignore: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
          <tr>
            <td style="background:#7c3aed;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">MangaZen</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#ffffff;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">${body}</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#7c3aed;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 8px;font-size:13px;color:#71717a;">${expiry}</p>
              <p style="margin:0;font-size:13px;color:#71717a;">${ignore}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:12px;color:#52525b;">© ${new Date().getFullYear()} MangaZen</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSecurityCodeHtml({
  heading,
  body,
  code,
  expiry,
  ignore,
}: {
  heading: string;
  body: string;
  code: string;
  expiry: string;
  ignore: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
          <tr>
            <td style="background:#7c3aed;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">MangaZen</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#ffffff;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">${body}</p>
              <div style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;color:#7c3aed;letter-spacing:8px;">${code}</span>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#71717a;">${expiry}</p>
              <p style="margin:0;font-size:13px;color:#71717a;">${ignore}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:12px;color:#52525b;">© ${new Date().getFullYear()} MangaZen</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
