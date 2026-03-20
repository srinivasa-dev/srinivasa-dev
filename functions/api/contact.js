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

    if (!env.RATE_LIMIT) {
      return textResponse("Server configuration error", 500);
    }

    const rateLimitKey = `rate:${ip}`;
    const currentRateCount = Number(await env.RATE_LIMIT.get(rateLimitKey) || "0");

    if (currentRateCount >= RATE_LIMIT_MAX_REQUESTS) {
      return textResponse("Too many requests", 429);
    }

    await env.RATE_LIMIT.put(rateLimitKey, String(currentRateCount + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    });

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

    const emailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: "hello@srinivasa.dev" }],
          },
        ],
        from: {
          email: "noreply@srinivasa.dev",
          name: "Website Contact",
        },
        reply_to: [
          {
            email,
            name,
          },
        ],
        subject: "New Contact Message",
        content: [
          {
            type: "text/plain",
            value: `Name: ${name}
Email: ${email}
IP: ${ip}

Message:
${message}`,
          },
        ],
      }),
    });

    if (!emailRes.ok) {
      return textResponse("Failed to send email", 500);
    }

    return textResponse("OK", 200);
  } catch {
    return textResponse("Server error", 500);
  }
}
