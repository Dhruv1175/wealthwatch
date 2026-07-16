/**
 * Centralized utility to verify if a user has a PRO subscription.
 * Do NOT check subscriptionEndDate directly in components.
 * The cron job handles resetting the tier when subscriptions expire.
 */
export function isUserPro(user: { tier?: string | null } | null | undefined): boolean {
  if (!user) return false;
  return user.tier === 'PRO';
}
