import type { UserRole, IntentType } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';

/**
 * Checks if a given role has permission to use a specific tool/intent.
 */
export function hasPermission(role: UserRole, intent: IntentType): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed.includes(intent);
}

/**
 * Returns a user-friendly access denied message.
 */
export function getAccessDeniedMessage(role: UserRole, intent: IntentType): string {
  const roleLabel = role === 'anon' ? 'Guest' : role === 'authenticated' ? 'Registered User' : 'Admin';
  
  const upgradeHint =
    role === 'anon'
      ? 'Please sign in or create an account to access this feature.'
      : 'This action requires administrator privileges.';

  return `🔒 Access Denied: The "${intent}" feature is not available for the ${roleLabel} role. ${upgradeHint}`;
}

/**
 * Returns the list of available tools for a given role.
 */
export function getAvailableTools(role: UserRole): IntentType[] {
  return ROLE_PERMISSIONS[role];
}
