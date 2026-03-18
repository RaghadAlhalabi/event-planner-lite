import nodemailer from "nodemailer";

const isTruthy = (value) => /^(1|true|yes|on)$/i.test(String(value || "").trim());

const EMAIL_ENABLED = isTruthy(process.env.EMAIL_ENABLED);
const SMTP_SECURE = isTruthy(process.env.SMTP_SECURE);
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();

let transporter;

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
};

const hasResendConfig = () => {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
};

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10),
      secure: SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const formatWhen = (startsAt) => {
  if (!startsAt) return "To be announced";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return String(startsAt);
  }

  return date.toUTCString();
};

const extractErrorDetail = (error) => {
  const code = error?.code ? String(error.code) : "";
  const responseCode = error?.responseCode ? String(error.responseCode) : "";
  const command = error?.command ? String(error.command) : "";
  const message = error?.message ? String(error.message) : "";

  const parts = [
    code && `code=${code}`,
    responseCode && `responseCode=${responseCode}`,
    command && `command=${command}`,
    message && `message=${message}`,
  ].filter(Boolean);

  return parts.join("; ") || "Unknown email provider error";
};

const sendWithSmtp = async ({ to, subject, text, html }) => {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "EmailConfigMissing", provider: "smtp" };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });

    return {
      sent: true,
      reason: "EmailSent",
      provider: "smtp",
      messageId: info.messageId || null,
    };
  } catch (error) {
    return {
      sent: false,
      reason: "EmailSendFailed",
      provider: "smtp",
      detail: extractErrorDetail(error),
    };
  }
};

const sendWithResend = async ({ to, subject, text, html }) => {
  if (!hasResendConfig()) {
    return { sent: false, reason: "EmailConfigMissing", provider: "resend" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        sent: false,
        reason: "EmailSendFailed",
        provider: "resend",
        detail: `status=${response.status}; message=${data?.message || "Request failed"}`,
      };
    }

    return {
      sent: true,
      reason: "EmailSent",
      provider: "resend",
      messageId: data?.id || null,
    };
  } catch (error) {
    return {
      sent: false,
      reason: "EmailSendFailed",
      provider: "resend",
      detail: extractErrorDetail(error),
    };
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (EMAIL_PROVIDER === "resend") {
    return sendWithResend({ to, subject, text, html });
  }

  return sendWithSmtp({ to, subject, text, html });
};

export const sendInvitationEmail = async ({ to, event, invitationId }) => {
  if (!EMAIL_ENABLED) {
    return { sent: false, reason: "EmailDisabled", provider: EMAIL_PROVIDER };
  }

  const appBase = process.env.APP_BASE_URL || "http://localhost:5173";
  const eventId = event?.external_id || event?.id;
  const inviteLink = `${appBase}/?event=${encodeURIComponent(String(eventId || ""))}&invite=${encodeURIComponent(String(invitationId || ""))}`;

  const subject = `Invitation: ${event?.title || "Event Planner Lite event"}`;
  const text = [
    `You are invited to: ${event?.title || "an event"}`,
    `When: ${formatWhen(event?.starts_at)}`,
    `Location: ${event?.location || "TBA"}`,
    "",
    "Open invitation:",
    inviteLink,
  ].join("\n");

  const html = `
    <p>You are invited to <strong>${event?.title || "an event"}</strong>.</p>
    <p><strong>When:</strong> ${formatWhen(event?.starts_at)}</p>
    <p><strong>Location:</strong> ${event?.location || "TBA"}</p>
    <p><a href="${inviteLink}">Open invitation</a></p>
  `;

  return sendEmail({ to, subject, text, html });
};

export const sendEmailProbe = async ({ to }) => {
  if (!EMAIL_ENABLED) {
    return { sent: false, reason: "EmailDisabled", provider: EMAIL_PROVIDER };
  }

  const appBase = process.env.APP_BASE_URL || "http://localhost:5173";

  return sendEmail({
    to,
    subject: "SMTP/Provider test - Event Planner Lite",
    text: `This is a test email from Event Planner Lite. If you received this, provider config is working.\n\nApp: ${appBase}`,
    html: `<p>This is a test email from <strong>Event Planner Lite</strong>.</p><p>If you received this, provider config is working.</p><p>App: <a href="${appBase}">${appBase}</a></p>`,
  });
};
