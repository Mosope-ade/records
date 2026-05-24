import { prisma } from "./db";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to all stored subscriptions, optionally excluding the triggering user.
 * Silently removes stale subscriptions (410 Gone).
 */
export async function sendPushNotification(payload: PushPayload, excludeUserId?: string) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured — skipping push notification");
    return;
  }

  // Fetch subscriptions, optionally excluding the triggering user
  const where = excludeUserId ? { NOT: { userId: excludeUserId } } : {};
  const subs = await prisma.pushSubscription.findMany({ where });
  if (!subs.length) return;

  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? "admin@shopsync.app"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired — clean up
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    })
  );
}

/**
 * Backwards compatible helper for admin-only or general updates.
 */
export async function sendAdminPush(payload: PushPayload) {
  return sendPushNotification(payload);
}

