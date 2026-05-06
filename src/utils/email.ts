import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(to: string, name: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Medsafe <noreply@medsafe.com>',
    to,
    subject: 'Código de verificação - Medsafe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563EB; margin-bottom: 8px;">Medsafe</h2>
        <p style="color: #374151;">Olá, <strong>${name}</strong>!</p>
        <p style="color: #374151;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p style="color: #374151;">Seu código de verificação é:</p>
        <div style="background: #EFF6FF; border: 2px solid #BFDBFE; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; font-weight: bold; color: #2563EB; letter-spacing: 10px;">${code}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Este código expira em <strong>15 minutos</strong>.</p>
        <p style="color: #6B7280; font-size: 14px;">Se você não solicitou a redefinição de senha, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #9CA3AF; font-size: 12px;">Medsafe — Seu cuidado, no horário certo</p>
      </div>
    `,
  })
}
