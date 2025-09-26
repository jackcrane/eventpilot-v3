const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtmlTags = (value = "") => String(value).replace(/<[^>]*>/g, "");

const decodeHtmlEntities = (value = "") => {
  const source = String(value);
  if (!source) return "";

  return source
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
    })
    .replace(/&#(\d+);/g, (_match, dec) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};

const parseLineTokens = (line = "") => {
  const source = String(line);
  if (!source) return [];

  const tokens = [];
  const anchorPattern = /<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let cursor = 0;
  let match;

  while ((match = anchorPattern.exec(source))) {
    const [fullMatch, href, label] = match;
    const leading = source.slice(cursor, match.index);
      if (leading) {
        const textValue = decodeHtmlEntities(stripHtmlTags(leading));
        if (textValue) {
          tokens.push({ type: "text", value: textValue });
        }
      }

    if (href) {
      tokens.push({
        type: "link",
        href: decodeHtmlEntities(href),
        label: decodeHtmlEntities(stripHtmlTags(label)) || decodeHtmlEntities(href),
      });
    }

    cursor = match.index + fullMatch.length;
  }

  if (cursor < source.length) {
    const trailing = decodeHtmlEntities(stripHtmlTags(source.slice(cursor)));
    if (trailing) {
      tokens.push({ type: "text", value: trailing });
    }
  }

  if (!tokens.length) {
    const fallback = decodeHtmlEntities(stripHtmlTags(source));
    return fallback ? [{ type: "text", value: fallback }] : [];
  }

  return tokens;
};

const toParagraphContent = (input = "") => {
  if (!input) {
    return { html: "", segments: [] };
  }

  const source = String(input);
  const sections = source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!sections.length) {
    const lines = source
      .split(/\n/g)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return { html: "", segments: [] };
    }

    return {
      html: lines.join("<br />"),
      segments: [lines.map((line) => parseLineTokens(line))],
    };
  }

  const rawSegments = sections
    .map((block) =>
      block
        .split(/\n/g)
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length);

  const html = rawSegments
    .map((lines) => `<p>${lines.join("<br />")}</p>`)
    .join("");

  const segments = rawSegments
    .map((lines) =>
      lines
        .map((line) => parseLineTokens(line))
        .filter((tokens) => tokens.length)
    )
    .filter((lines) => lines.length);

  return { html, segments };
};

const pickEmailAddress = (context = {}) => {
  const explicit = context?.emailAddress;
  if (explicit) return explicit;
  const email = context?.personEmail;
  if (email && typeof email.email === "string") return email.email;
  const emails = context?.person?.emails;
  if (Array.isArray(emails) && emails.length) {
    const active = emails.find((item) => item && !item.deleted && item.email);
    if (active?.email) return active.email;
    const any = emails.find((item) => item?.email);
    if (any?.email) return any.email;
  }
  return "";
};

const VARIABLE_DEFINITIONS = {
  name: ({ person }) => {
    const raw = person?.name ?? "";
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const fallback = trimmed || "there";
    return {
      text: fallback,
      html: escapeHtml(fallback),
    };
  },
  email: (context) => {
    const email = pickEmailAddress(context);
    return {
      text: email,
      html: escapeHtml(email),
    };
  },
  eventName: ({ event }) => {
    const name = event?.name || "";
    return {
      text: name,
      html: escapeHtml(name),
    };
  },
  campaignName: ({ campaign }) => {
    const name = campaign?.name || "";
    return {
      text: name,
      html: escapeHtml(name),
    };
  },
  unsubLink: ({ unsubscribeUrl }) => {
    const url = unsubscribeUrl || "";
    return {
      text: url,
      html: escapeHtml(url),
    };
  },
  unsubClickHere: ({ unsubscribeUrl }) => {
    const url = unsubscribeUrl || "";
    if (!url) {
      return { text: "", html: "" };
    }
    return {
      text: `click here to unsubscribe: ${url}`,
      html: `<a href="${escapeHtml(url)}">click here to unsubscribe</a>`,
    };
  },
};

export const EMAIL_TEMPLATE_VARIABLES = Object.keys(VARIABLE_DEFINITIONS);

const resolveVariableValue = (key, context, variant) => {
  const resolver = VARIABLE_DEFINITIONS[key];
  if (!resolver) return "";
  try {
    const resolved = resolver(context) ?? "";
    if (typeof resolved === "string") return resolved;
    if (resolved && typeof resolved === "object") {
      const candidate = resolved[variant];
      if (typeof candidate === "string") {
        return candidate;
      }
    }
    return "";
  } catch (error) {
    console.warn(`[emailTemplates] Failed to resolve variable ${key}:`, error);
    return "";
  }
};

const applyVariant = (templateText, context, variant) => {
  if (!templateText) return "";
  const placeholders = [];
  let working = String(templateText).replace(TOKEN_REGEX, (match, key) => {
    const value = resolveVariableValue(key, context, variant);
    const placeholder = `__VAR_${placeholders.length}__`;
    placeholders.push(value || "");
    return placeholder;
  });

  if (variant === "html") {
    working = escapeHtml(working);
  }

  placeholders.forEach((value, index) => {
    const token = `__VAR_${index}__`;
    working = working.split(token).join(value || "");
  });

  if (variant === "html") {
    return working;
  }

  return working;
};

export const renderEmailTemplate = (templateText, context = {}) => {
  const textBody = applyVariant(templateText || "", context, "text").trim();
  const htmlRaw = applyVariant(templateText || "", context, "html");
  const { html: htmlBody, segments: htmlSegments } =
    toParagraphContent(htmlRaw);
  const preview = textBody.replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    text: textBody,
    html: htmlBody,
    htmlSegments,
    previewText: preview,
  };
};

export const isTemplateEmpty = (templateText) => {
  if (!templateText) return true;
  const stripped = String(templateText).replace(TOKEN_REGEX, "").trim();
  return stripped.length === 0;
};

export const describeTemplateContext = () =>
  Object.entries(VARIABLE_DEFINITIONS).map(([key]) => ({
    key,
    // Convert resolver output into human description lazily when needed
    description: key,
  }));
