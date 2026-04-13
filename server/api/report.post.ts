/**
 * POST /api/report — Submit a bug report or feedback.
 *
 * Rate-limited: 3 per hour per IP. Stores in the comments table
 * (type='report' or 'feedback'). Optionally emails the site owner
 * via Resend if RESEND_API_KEY is configured.
 */
import { prisma } from '~/server/utils/prisma';
import { rateLimit } from '~/server/utils/rate-limit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_EMAIL = process.env.REPORT_EMAIL || 'hugo@wordle.global';

interface ReportBody {
    message: string;
    type: 'bug' | 'feedback';
    url?: string;
    lang?: string;
    mode?: string;
    userAgent?: string;
    screenSize?: string;
    isPwa?: boolean;
}

export default defineEventHandler(async (event) => {
    rateLimit(event, 'report', 3, 60 * 60 * 1000);

    const body = await readBody<ReportBody>(event);

    if (!body.message || typeof body.message !== 'string') {
        throw createError({ statusCode: 400, message: 'Message is required.' });
    }

    const message = body.message.trim().slice(0, 2000);
    if (message.length < 5) {
        throw createError({ statusCode: 400, message: 'Message is too short.' });
    }

    // Optional auth — attach user if logged in
    let userId: string | null = null;
    let username: string | null = null;
    let email: string | null = null;
    try {
        const session = await getUserSession(event);
        const user = session?.user as any;
        if (user?.id) {
            userId = user.id;
            username = user.displayName || null;
            email = user.email || null;
        }
    } catch {
        // Not logged in — that's fine
    }

    const type = body.type === 'feedback' ? 'feedback' : 'report';

    // Store in database — this is the primary record
    await prisma.comment.create({
        data: {
            userId,
            type,
            body: message,
            metadata: {
                url: body.url || null,
                lang: body.lang || null,
                mode: body.mode || null,
                userAgent: body.userAgent || null,
                screenSize: body.screenSize || null,
                isPwa: body.isPwa ?? null,
                username,
                email,
            },
        },
    });

    // Optional email notification (best-effort, never blocks the response)
    if (RESEND_API_KEY) {
        sendNotificationEmail(type, message, body, username, email).catch((e) => {
            console.error('[report] Email notification failed:', (e as Error).message);
        });
    }

    return { ok: true };
});

async function sendNotificationEmail(
    type: string,
    message: string,
    body: ReportBody,
    username: string | null,
    email: string | null
) {
    const typeLabel = type === 'report' ? '🐛 Bug Report' : '💬 Feedback';

    const contextRows = [
        body.url ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">URL</td><td style="padding:4px 0">${esc(body.url)}</td></tr>` : '',
        body.lang ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">Language</td><td style="padding:4px 0">${esc(body.lang)}</td></tr>` : '',
        body.mode ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">Mode</td><td style="padding:4px 0">${esc(body.mode)}</td></tr>` : '',
        body.userAgent ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">Browser</td><td style="padding:4px 0;font-size:12px;word-break:break-all">${esc(body.userAgent)}</td></tr>` : '',
        body.screenSize ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">Screen</td><td style="padding:4px 0">${esc(body.screenSize)}</td></tr>` : '',
        body.isPwa != null ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">PWA</td><td style="padding:4px 0">${body.isPwa ? 'Yes' : 'No'}</td></tr>` : '',
        username ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">User</td><td style="padding:4px 0">${esc(username)}${email ? ` (${esc(email)})` : ''}</td></tr>` : '<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">User</td><td style="padding:4px 0;color:#999">Guest</td></tr>',
    ].filter(Boolean).join('\n');

    const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px">
    <h2 style="margin:0 0 16px;font-size:18px">${typeLabel}</h2>
    <div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:16px;margin-bottom:16px;white-space:pre-wrap;font-size:14px;line-height:1.6">${esc(message)}</div>
    <table style="font-size:13px;border-collapse:collapse">
        ${contextRows}
    </table>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0 12px" />
    <p style="font-size:11px;color:#999;margin:0">Sent from wordle.global in-app report</p>
</div>`;

    const subject = `[Wordle] ${typeLabel}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`;

    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
        from: 'Wordle Global <noreply@wordle.global>',
        to: REPORT_EMAIL,
        replyTo: email || undefined,
        subject,
        html,
    });
}

function esc(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
