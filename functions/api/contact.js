const MAX_REQUEST_BYTES = 10_000;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2_000;
const MIN_MESSAGE_LENGTH = 10;
const MIN_FORM_FILL_MS = 4_000;
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function textResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedOrigin(request, env) {
  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const publicSiteUrl = normalizeText(env.PUBLIC_SITE_URL);

  if (publicSiteUrl) {
    try {
      allowedOrigins.add(new URL(publicSiteUrl).origin);
    } catch {
      // Ignore invalid optional env values.
    }
  }

  const origin = request.headers.get("Origin");
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = request.headers.get("Referer");
  if (!referer) {
    return false;
  }

  try {
    return allowedOrigins.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

function hasSuspiciousLinks(message) {
  const urls = message.match(/https?:\/\//gi) || [];
  return urls.length > 3;
}

function buildSubmissionRecord({ name, email, message }) {
  return {
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
    deliveryStatus: "pending",
  };
}

function buildSubmissionKey(createdAt) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `contact:${createdAt}:${suffix}`;
}

async function persistSubmission(env, key, record) {
  if (!env.CONTACT_KV) {
    return;
  }

  await env.CONTACT_KV.put(key, JSON.stringify(record));
}

async function enforceRateLimit(env, ip) {
  if (!env.RATE_LIMIT) {
    return null;
  }

  const rateLimitKey = `rate:${ip}`;
  const currentRateCount = Number((await env.RATE_LIMIT.get(rateLimitKey)) || "0");

  if (currentRateCount >= RATE_LIMIT_MAX_REQUESTS) {
    return textResponse("Too many requests", 429);
  }

  await env.RATE_LIMIT.put(rateLimitKey, String(currentRateCount + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });

  return null;
}

async function sendWithResend({ env, ip, name, email, message }) {
  const toEmail = normalizeText(env.CONTACT_TO_EMAIL) || "hello@srinivasa.dev";
  const fromEmail = normalizeText(env.CONTACT_FROM_EMAIL) || "noreply@srinivasa.dev";
  const apiKey = normalizeText(env.RESEND_API_KEY) || normalizeText(env.APIKEYS_RESEND);
  const submittedAt = new Date().toISOString();
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedSubmittedAt = escapeHtml(submittedAt);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>");

  if (!apiKey) {
    return textResponse("Missing RESEND_API_KEY", 500);
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `Website Contact <${fromEmail}>`,
      to: [toEmail],
      reply_to: email,
      subject: `New portfolio inquiry from ${name}`,
      html: `<div style="margin:0;padding:40px 20px;background:#f3f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111111;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #ebe6dc;border-radius:24px;overflow:hidden;box-shadow:0 16px 40px rgba(17,17,17,0.06);">
    <div style="padding:34px 34px 18px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a7f70;margin-bottom:14px;">Portfolio Contact</div>
      <h1 style="margin:0;font-size:28px;line-height:1.25;color:#111111;font-weight:700;">New inquiry from ${escapedName}</h1>
    </div>
    <div style="padding:0 34px 34px;">
      <div style="margin-bottom:28px;padding:18px 20px;background:#f8f5ef;border:1px solid #efe7da;border-radius:18px;">
        <div style="font-size:12px;color:#8a7f70;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.12em;">Reply to</div>
        <a href="mailto:${escapedEmail}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111111;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapedEmail}</a>
      </div>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:12px;color:#8a7f70;width:120px;text-transform:uppercase;letter-spacing:0.08em;">Name</td>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:15px;color:#111111;">${escapedName}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:12px;color:#8a7f70;text-transform:uppercase;letter-spacing:0.08em;">Email</td>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:15px;color:#111111;">${escapedEmail}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:12px;color:#8a7f70;text-transform:uppercase;letter-spacing:0.08em;">Time</td>
          <td style="padding:12px 0;border-top:1px solid #f2eee6;font-size:15px;color:#111111;">${escapedSubmittedAt}</td>
        </tr>
      </table>
      <div style="font-size:12px;color:#8a7f70;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.12em;">Message</div>
      <div style="padding:22px 22px;border-radius:18px;background:#fcfaf6;border:1px solid #f0eadf;font-size:16px;line-height:1.75;color:#111111;">${escapedMessage}</div>
    </div>
  </div>
</div>`,
      text: `New contact form submission
===========================

From
- Name: ${name}
- Email: ${email}

Submitted
- Time: ${submittedAt}

Message
-------
${message}

Reply
-----
Reply directly to this email to respond to ${name}.`,
    }),
  });

  if (emailRes.ok) {
    return null;
  }

  const upstreamText = normalizeText(await emailRes.text());
  return textResponse(upstreamText || `Resend returned ${emailRes.status}`, 500);
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) {
      return textResponse("Forbidden", 403);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return textResponse("Unsupported content type", 415);
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength && contentLength > MAX_REQUEST_BYTES) {
      return textResponse("Payload too large", 413);
    }

    if (!isAllowedOrigin(request, env)) {
      return textResponse("Forbidden", 403);
    }

    const rateLimitResponse = await enforceRateLimit(env, ip);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return textResponse("Invalid request body", 400);
    }

    const name = normalizeText(data?.name);
    const email = normalizeText(data?.email).toLowerCase();
    const message = normalizeText(data?.message);
    const company = normalizeText(data?.company);
    const website = normalizeText(data?.website);
    const formStartedAt = Number(data?.formStartedAt || 0);

    if (company || website) {
      return textResponse("Invalid submission", 400);
    }

    if (!name || !email || !message) {
      return textResponse("Missing fields", 400);
    }

    if (
      name.length > MAX_NAME_LENGTH ||
      email.length > MAX_EMAIL_LENGTH ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return textResponse("Input too long", 400);
    }

    if (message.length < MIN_MESSAGE_LENGTH) {
      return textResponse("Message too short", 400);
    }

    if (!isValidEmail(email)) {
      return textResponse("Invalid email", 400);
    }

    if (!/^[\p{L}\p{N} .,'’()-]+$/u.test(name)) {
      return textResponse("Invalid name", 400);
    }

    if (!Number.isFinite(formStartedAt)) {
      return textResponse("Invalid submission", 400);
    }

    const formAge = Date.now() - formStartedAt;
    if (formAge < MIN_FORM_FILL_MS || formAge > MAX_FORM_AGE_MS) {
      return textResponse("Invalid submission", 400);
    }

    if (hasSuspiciousLinks(message)) {
      return textResponse("Invalid submission", 400);
    }

    const submissionRecord = buildSubmissionRecord({
      name,
      email,
      message,
    });
    const submissionKey = buildSubmissionKey(submissionRecord.createdAt);
    await persistSubmission(env, submissionKey, submissionRecord);

    const emailErrorResponse = await sendWithResend({
      env,
      ip,
      name,
      email,
      message,
    });
    if (emailErrorResponse) {
      submissionRecord.deliveryStatus = "failed";
      await persistSubmission(env, submissionKey, submissionRecord);
      return emailErrorResponse;
    }

    submissionRecord.deliveryStatus = "sent";
    await persistSubmission(env, submissionKey, submissionRecord);

    return textResponse("OK", 200);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Server error";
    return textResponse(message, 500);
  }
}
