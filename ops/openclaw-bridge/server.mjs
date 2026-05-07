import { createHash, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import {
  MECHI_ALLOWED_TOPICS,
  MECHI_BLOCKED_TOPICS,
  buildMechiBridgeContext,
  buildMechiBridgeSystemPrompt,
} from './mechi-knowledge.mjs';

const HOST = process.env.MECHI_OPENCLAW_BRIDGE_HOST?.trim() || '127.0.0.1';
const PORT = toPositiveInt(process.env.MECHI_OPENCLAW_BRIDGE_PORT, 8788);
const AUTH_TOKEN =
  process.env.MECHI_OPENCLAW_BRIDGE_TOKEN?.trim() ||
  process.env.BRIDGE_AUTH_TOKEN?.trim() ||
  '';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN?.trim() || 'openclaw';
const SUPPORT_AGENT = process.env.MECHI_OPENCLAW_SUPPORT_AGENT?.trim() || 'support';
const INSTAGRAM_AGENT = process.env.MECHI_OPENCLAW_INSTAGRAM_AGENT?.trim() || SUPPORT_AGENT;
const EMAIL_AGENT = process.env.MECHI_OPENCLAW_EMAIL_AGENT?.trim() || SUPPORT_AGENT;
const SUPPORT_MODEL =
  process.env.MECHI_OPENCLAW_SUPPORT_MODEL?.trim() || 'openai-codex/gpt-5.5';
const INSTAGRAM_MODEL =
  process.env.MECHI_OPENCLAW_INSTAGRAM_MODEL?.trim() || SUPPORT_MODEL;
const EMAIL_MODEL = process.env.MECHI_OPENCLAW_EMAIL_MODEL?.trim() || SUPPORT_MODEL;
const OPENCLAW_THINKING = process.env.MECHI_OPENCLAW_THINKING?.trim() || 'fast';
const OPENCLAW_TIMEOUT_SECONDS = toPositiveInt(process.env.MECHI_OPENCLAW_TIMEOUT_SECONDS, 120);
const MAX_BODY_BYTES = toPositiveInt(process.env.MECHI_OPENCLAW_MAX_BODY_BYTES, 256_000);
const MAX_EMAIL_TEXT_CHARS = toPositiveInt(process.env.MECHI_OPENCLAW_MAX_EMAIL_TEXT_CHARS, 16_000);

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function json(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBearerToken(headers) {
  const raw = headers.authorization ?? headers.Authorization;
  if (typeof raw !== 'string') {
    return '';
  }
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function isAuthorized(request) {
  if (!AUTH_TOKEN) {
    return false;
  }
  const provided = parseBearerToken(request.headers);
  return Boolean(provided) && safeEqual(provided, AUTH_TOKEN);
}

function requestIdFor(request) {
  const remote = request.socket.remoteAddress || 'unknown';
  return createHash('sha1')
    .update(`${Date.now()}:${remote}:${Math.random()}`)
    .digest('hex')
    .slice(0, 12);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim();
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400, cause: error }));
      }
    });

    request.on('error', reject);
  });
}

function stringifyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function textLimit(value, maxChars = MAX_EMAIL_TEXT_CHARS) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`;
}

function normalizeEmailList(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeEmailPayload(input) {
  const headers =
    input?.headers && typeof input.headers === 'object' && !Array.isArray(input.headers)
      ? input.headers
      : {};
  const to = normalizeEmailList(input?.to);
  const cc = normalizeEmailList(input?.cc);

  return {
    sourceAccount: firstString(
      input?.source_account,
      input?.mailbox,
      input?.account,
      headers['delivered-to'],
      headers['x-original-to']
    ),
    messageId: firstString(input?.message_id, input?.messageId, headers['message-id']),
    from: firstString(input?.from, input?.sender, headers.from),
    replyTo: firstString(input?.reply_to, input?.replyTo, headers['reply-to']),
    to: to.length ? to : normalizeEmailList(headers.to),
    cc: cc.length ? cc : normalizeEmailList(headers.cc),
    subject: firstString(input?.subject, headers.subject) || '[no subject]',
    receivedAt: firstString(input?.received_at, input?.receivedAt, headers.date),
    text: textLimit(firstString(input?.text, input?.body, input?.plain_text, input?.plainText)),
    html: textLimit(firstString(input?.html), Math.min(MAX_EMAIL_TEXT_CHARS, 6000)),
    rawHeaders: headers,
    attachments: Array.isArray(input?.attachments) ? input.attachments : [],
    rawSizeBytes:
      Number.isFinite(Number(input?.raw_size_bytes))
        ? Number(input.raw_size_bytes)
        : Number.isFinite(Number(input?.rawSizeBytes))
          ? Number(input.rawSizeBytes)
          : null,
  };
}

function conversationToText(conversation) {
  if (!Array.isArray(conversation)) {
    return '[]';
  }

  return conversation
    .map((entry, index) => {
      const role = typeof entry?.role === 'string' ? entry.role : 'unknown';
      const sender = typeof entry?.sender === 'string' ? entry.sender : 'unknown';
      const messageType = typeof entry?.messageType === 'string' ? entry.messageType : 'unknown';
      const createdAt = typeof entry?.createdAt === 'string' ? entry.createdAt : 'unknown';
      const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
      return [
        `Message ${index + 1}`,
        `role=${role}`,
        `sender=${sender}`,
        `type=${messageType}`,
        `created_at=${createdAt}`,
        `text=${text || '[empty]'}`,
      ].join('\n');
    })
    .join('\n\n');
}

function buildSupportPrompt(input) {
  const systemPrompt = input.system_prompt || buildMechiBridgeSystemPrompt('support');
  const mechiContext =
    typeof input.mechi_context === 'string' && input.mechi_context.trim()
      ? input.mechi_context
      : buildMechiBridgeContext({
          channel: 'support',
          userSummary: input.user_summary,
        });

  return [
    'You are the dedicated Mechi support agent running inside OpenClaw.',
    'Reply as a helpful Mechi support teammate for Kenyan gamers.',
    'Return exactly one JSON object and nothing else.',
    'Do not use markdown, code fences, or commentary outside the JSON.',
    'Required response schema:',
    '{"disposition":"reply|clarify|escalate","reply_text":"string|null","confidence":"number|null","tags":["string"],"escalation_reason":"string|null"}',
    'Rules:',
    '- Use "reply" when you can answer safely and directly.',
    '- Use "clarify" when more user detail is required before answering.',
    '- Use "escalate" when the topic is blocked, risky, account-sensitive beyond the provided context, or should go to a human.',
    '- Keep reply_text concise, useful, and ready to send to the customer as-is.',
    '- confidence must be between 0 and 1.',
    '- tags must be short lowercase labels.',
    '- If escalating, explain the machine reason in escalation_reason.',
    '',
    'SYSTEM PROMPT (highest priority business rules):',
    systemPrompt,
    '',
    'ALLOWED TOPICS:',
    stringifyJson(input.allowed_topics || MECHI_ALLOWED_TOPICS),
    '',
    'BLOCKED TOPICS:',
    stringifyJson(input.blocked_topics || MECHI_BLOCKED_TOPICS),
    '',
    'MECHI CONTEXT:',
    mechiContext,
    '',
    'USER SUMMARY:',
    stringifyJson(input.user_summary ?? null),
    '',
    `THREAD ID: ${String(input.thread_id || '')}`,
    `PHONE OR CHANNEL HANDLE: ${String(input.phone || '')}`,
    '',
    'CONVERSATION WINDOW:',
    conversationToText(input.conversation),
  ].join('\n');
}

function buildInstagramPrompt(input) {
  const senderId = String(input?.sender?.id || '').trim();
  const recipientId = String(input?.recipient?.id || '').trim();
  const messageText = typeof input?.message?.text === 'string' ? input.message.text.trim() : '';
  const systemPrompt = input.system_prompt || buildMechiBridgeSystemPrompt('instagram');
  const mechiContext =
    typeof input.mechi_context === 'string' && input.mechi_context.trim()
      ? input.mechi_context
      : buildMechiBridgeContext({
          channel: 'instagram',
          userSummary: input.user_summary,
        });

  return [
    'You are the dedicated Mechi Instagram DM assistant running inside OpenClaw.',
    'Return strict JSON only with the schema {"replies":["message 1","message 2"]}.',
    'Do not include markdown or commentary outside the JSON.',
    'Rules:',
    '- Keep replies short, friendly, and brand-safe.',
    '- If the message needs a human, say so briefly and ask for the best next detail.',
    '- Never invent account actions or payment confirmations.',
    '',
    'SYSTEM PROMPT (highest priority business rules):',
    systemPrompt,
    '',
    'ALLOWED TOPICS:',
    stringifyJson(input.allowed_topics || MECHI_ALLOWED_TOPICS),
    '',
    'BLOCKED TOPICS:',
    stringifyJson(input.blocked_topics || MECHI_BLOCKED_TOPICS),
    '',
    'MECHI CONTEXT:',
    mechiContext,
    '',
    `SENDER ID: ${senderId}`,
    `RECIPIENT ID: ${recipientId}`,
    'MESSAGE:',
    messageText || '[no text]',
    '',
    'ATTACHMENTS:',
    stringifyJson(input?.message?.attachments || []),
    '',
    'RAW EVENT:',
    stringifyJson(input?.raw_event || {}),
  ].join('\n');
}

function buildEmailPrompt(input) {
  const email = normalizeEmailPayload(input);
  const systemPrompt = input.system_prompt || buildMechiBridgeSystemPrompt('email');
  const mechiContext =
    typeof input.mechi_context === 'string' && input.mechi_context.trim()
      ? input.mechi_context
      : buildMechiBridgeContext({
          channel: 'email',
          userSummary: input.user_summary,
        });

  return [
    'You are the dedicated Mechi email support agent running inside OpenClaw.',
    'This is inbound email routed from Mechi/Chezahub cPanel mailboxes.',
    'Return exactly one JSON object and nothing else.',
    'Do not use markdown, code fences, or commentary outside the JSON.',
    'Required response schema:',
    '{"disposition":"reply|clarify|escalate","reply_text":"string|null","confidence":"number|null","tags":["string"],"escalation_reason":"string|null"}',
    'Rules:',
    '- Produce a concise email reply draft in reply_text when safe.',
    '- Do not claim the reply has been sent; this bridge only generates the bot response.',
    '- Use "clarify" when one missing detail is needed before a safe answer.',
    '- Use "escalate" for payment confirmations, refunds, payouts, account mutations, deletion requests, bans, disputes, legal/privacy requests, or anything requiring verified account state.',
    '- Never invent mailbox state, delivery status, payment state, refund status, tournament rulings, ban outcomes, or account changes.',
    '- Include "email" and the mailbox domain in tags when relevant.',
    '',
    'SYSTEM PROMPT (highest priority business rules):',
    systemPrompt,
    '',
    'ALLOWED TOPICS:',
    stringifyJson(input.allowed_topics || MECHI_ALLOWED_TOPICS),
    '',
    'BLOCKED TOPICS:',
    stringifyJson(input.blocked_topics || MECHI_BLOCKED_TOPICS),
    '',
    'MECHI CONTEXT:',
    mechiContext,
    '',
    'USER SUMMARY:',
    stringifyJson(input.user_summary ?? null),
    '',
    'EMAIL METADATA:',
    stringifyJson({
      source_account: email.sourceAccount,
      message_id: email.messageId,
      from: email.from,
      reply_to: email.replyTo,
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      received_at: email.receivedAt,
      raw_size_bytes: email.rawSizeBytes,
      attachment_count: email.attachments.length,
    }),
    '',
    'EMAIL TEXT:',
    email.text || '[no plain text body]',
    '',
    'EMAIL HTML PREVIEW:',
    email.html || '[no html body supplied]',
    '',
    'RAW HEADERS:',
    stringifyJson(email.rawHeaders),
  ].join('\n');
}

function parseJsonCandidate(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  return null;
}

function toSessionId(prefix, rawValue) {
  const normalized = String(rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = normalized || 'unknown';
  return `${prefix}-${suffix}`.slice(0, 120);
}

function flattenTextCandidates(value) {
  if (typeof value === 'string') {
    return [value.trim()].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenTextCandidates(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const object = value;
  const priorityKeys = [
    'text',
    'message',
    'reply',
    'response',
    'content',
    'finalText',
    'assistant',
    'output',
  ];

  const collected = [];
  for (const key of priorityKeys) {
    if (key in object) {
      collected.push(...flattenTextCandidates(object[key]));
    }
  }

  for (const child of Object.values(object)) {
    if (typeof child === 'object' && child !== null) {
      collected.push(...flattenTextCandidates(child));
    }
  }

  return collected;
}

function parseCliPayload(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { raw: '', json: null, text: '' };
  }

  const jsonLines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = jsonLines.length - 1; index >= 0; index -= 1) {
    const parsed = parseJsonCandidate(jsonLines[index]);
    if (parsed !== null) {
      const texts = flattenTextCandidates(parsed);
      return {
        raw: trimmed,
        json: parsed,
        text: texts.join('\n').trim(),
      };
    }
  }

  const parsed = parseJsonCandidate(trimmed);
  if (parsed !== null) {
    const texts = flattenTextCandidates(parsed);
    return {
      raw: trimmed,
      json: parsed,
      text: texts.join('\n').trim(),
    };
  }

  return {
    raw: trimmed,
    json: null,
    text: trimmed,
  };
}

function runOpenClawAgent({ agent, sessionId, prompt, timeoutSeconds, model }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      OPENCLAW_BIN,
      [
        'agent',
        '--agent',
        agent,
        '--session-id',
        sessionId,
        '--message',
        prompt,
        '--thinking',
        OPENCLAW_THINKING,
        '--timeout',
        String(timeoutSeconds),
        '--model',
        model,
        '--json',
      ],
      {
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.npm-global/bin:${process.env.PATH || ''}`,
        },
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`OpenClaw exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }

      resolve(parseCliPayload(stdout));
    });
  });
}

function clampConfidence(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.min(1, numeric));
}

function normalizeSupportResponse(cliResult) {
  const parsedObject =
    cliResult.json && typeof cliResult.json === 'object' && !Array.isArray(cliResult.json)
      ? cliResult.json
      : parseJsonCandidate(cliResult.text);

  if (parsedObject && typeof parsedObject === 'object' && !Array.isArray(parsedObject)) {
    const disposition = normalizeDisposition(parsedObject.disposition, parsedObject.reply_text);
    const replyText =
      typeof parsedObject.reply_text === 'string' && parsedObject.reply_text.trim()
        ? parsedObject.reply_text.trim()
        : typeof parsedObject.reply === 'string' && parsedObject.reply.trim()
          ? parsedObject.reply.trim()
          : typeof parsedObject.text === 'string' && parsedObject.text.trim()
            ? parsedObject.text.trim()
            : null;

    return {
      disposition,
      reply_text: replyText,
      confidence: clampConfidence(parsedObject.confidence),
      tags: Array.isArray(parsedObject.tags)
        ? parsedObject.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
        : [],
      escalation_reason:
        typeof parsedObject.escalation_reason === 'string' && parsedObject.escalation_reason.trim()
          ? parsedObject.escalation_reason.trim()
          : null,
    };
  }

  return {
    disposition: cliResult.text ? 'reply' : 'escalate',
    reply_text: cliResult.text || null,
    confidence: cliResult.text ? 0.55 : null,
    tags: cliResult.text ? ['bridge-fallback'] : [],
    escalation_reason: cliResult.text ? null : 'empty_openclaw_response',
  };
}

function normalizeDisposition(value, replyText) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'reply' || normalized === 'clarify' || normalized === 'escalate') {
    return normalized;
  }
  return replyText ? 'reply' : 'escalate';
}

function normalizeInstagramResponse(cliResult) {
  const collectReplies = (parsed) => {
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => flattenTextCandidates(item)).filter(Boolean).slice(0, 4);
    }

    if (parsed && typeof parsed === 'object') {
      const directReplies = Array.isArray(parsed.replies)
        ? parsed.replies.flatMap((item) => flattenTextCandidates(item))
        : [];
      const messageReplies = Array.isArray(parsed.messages)
        ? parsed.messages.flatMap((item) => flattenTextCandidates(item))
        : [];
      const singleReply = flattenTextCandidates(parsed.reply ?? parsed.text ?? parsed.message);
      return [...directReplies, ...messageReplies, ...singleReply].filter(Boolean).slice(0, 4);
    }

    return [];
  };

  const primaryReplies = collectReplies(cliResult.json);
  if (primaryReplies.length > 0) {
    return { replies: primaryReplies };
  }

  const reparsedText = parseJsonCandidate(cliResult.text);
  const textReplies = collectReplies(reparsedText);
  if (textReplies.length > 0) {
    return { replies: textReplies };
  }

  return { replies: cliResult.text ? [cliResult.text] : [] };
}

const server = http.createServer(async (request, response) => {
  const requestId = requestIdFor(request);
  const path = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;

  if (request.method === 'GET' && path === '/healthz') {
      json(response, 200, {
        ok: true,
        service: 'mechi-openclaw-bridge',
        openclaw_bin: OPENCLAW_BIN,
        support_agent: SUPPORT_AGENT,
        instagram_agent: INSTAGRAM_AGENT,
        email_agent: EMAIL_AGENT,
        support_model: SUPPORT_MODEL,
        instagram_model: INSTAGRAM_MODEL,
        email_model: EMAIL_MODEL,
      });
      return;
  }

  if (!AUTH_TOKEN) {
    json(response, 500, {
      error: 'MECHI_OPENCLAW_BRIDGE_TOKEN is not configured',
      request_id: requestId,
    });
    return;
  }

  if (!isAuthorized(request)) {
    json(response, 401, {
      error: 'Unauthorized',
      request_id: requestId,
    });
    return;
  }

  try {
    if (request.method === 'POST' && path === '/v1/mechi-support-reply') {
      const input = await readJsonBody(request);
      const cliResult = await runOpenClawAgent({
        agent: SUPPORT_AGENT,
        sessionId: toSessionId('mechi-support', input.thread_id || 'unknown-thread'),
        prompt: buildSupportPrompt(input),
        timeoutSeconds: OPENCLAW_TIMEOUT_SECONDS,
        model: SUPPORT_MODEL,
      });

      json(response, 200, normalizeSupportResponse(cliResult));
      return;
    }

    if (request.method === 'POST' && path === '/webhooks/instagram') {
      const input = await readJsonBody(request);
      const senderId = String(input?.sender?.id || 'unknown-instagram-sender');
      const cliResult = await runOpenClawAgent({
        agent: INSTAGRAM_AGENT,
        sessionId: toSessionId('instagram', senderId),
        prompt: buildInstagramPrompt(input),
        timeoutSeconds: OPENCLAW_TIMEOUT_SECONDS,
        model: INSTAGRAM_MODEL,
      });

      json(response, 200, normalizeInstagramResponse(cliResult));
      return;
    }

    if (request.method === 'POST' && path === '/webhooks/email') {
      const input = await readJsonBody(request);
      const email = normalizeEmailPayload(input);
      const cliResult = await runOpenClawAgent({
        agent: EMAIL_AGENT,
        sessionId: toSessionId(
          'email',
          email.messageId || `${email.sourceAccount}:${email.from}:${email.subject}`
        ),
        prompt: buildEmailPrompt(input),
        timeoutSeconds: OPENCLAW_TIMEOUT_SECONDS,
        model: EMAIL_MODEL,
      });

      json(response, 200, {
        ...normalizeSupportResponse(cliResult),
        channel: 'email',
        source_account: email.sourceAccount || null,
        message_id: email.messageId || null,
      });
      return;
    }

    json(response, 404, {
      error: 'Not found',
      request_id: requestId,
    });
  } catch (error) {
    console.error(`[bridge:${requestId}]`, error);
    json(response, error?.statusCode || 502, {
      error: error instanceof Error ? error.message : 'Bridge execution failed',
      request_id: requestId,
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'mechi-openclaw-bridge',
      host: HOST,
      port: PORT,
      support_agent: SUPPORT_AGENT,
      instagram_agent: INSTAGRAM_AGENT,
      email_agent: EMAIL_AGENT,
      support_model: SUPPORT_MODEL,
      instagram_model: INSTAGRAM_MODEL,
      email_model: EMAIL_MODEL,
    })
  );
});
