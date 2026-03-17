import nodemailer from "nodemailer";

const isTruthy = (value) => /^(1|true|yes|on)$/i.test(String(value || "").trim());

const EMAIL_ENABLED = isTruthy(process.env.EMAIL_ENABLED);
const SMTP_SECURE = isTruthy(process.env.SMTP_SECURE);

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

export const sendInvitationEmail = async ({ to, event, invitationId }) => {
  if (!EMAIL_ENABLED) {
    return { sent: false, reason: "EmailDisabled" };
  }

  if (!hasSmtpConfig()) {
    return { sent: false, reason: "EmailConfigMissing" };
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
      messageId: info.messageId || null,
    };
  } catch {
    return { sent: false, reason: "EmailSendFailed" };
  }
};

export const sendEmailProbe = async ({ to }) => {
  if (!EMAIL_ENABLED) {
    return { sent: false, reason: "EmailDisabled" };
  }

  if (!hasSmtpConfig()) {
    return { sent: false, reason: "EmailConfigMissing" };
  }

  const appBase = process.env.APP_BASE_URL || "http://localhost:5173";

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "SMTP test - Event Planner Lite",
      text: `This is a test email from Event Planner Lite. If you received this, SMTP is configured correctly.\n\nApp: ${appBase}`,
      html: `<p>This is a test email from <strong>Event Planner Lite</strong>.</p><p>If you received this, SMTP is configured correctly.</p><p>App: <a href="${appBase}">${appBase}</a></p>`,
    });

    return {
      sent: true,
      reason: "EmailSent",
      messageId: info.messageId || null,
    };
  } catch {
    return { sent: false, reason: "EmailSendFailed" };
  }
};
