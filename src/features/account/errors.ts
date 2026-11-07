import { isAuthRetryableFetchError } from '@supabase/supabase-js';

export function authErrorMessage(error: unknown, fallback: string): string {
  if (isAuthRetryableFetchError(error)) return 'Could not reach the account service. Check your connection and try again.';
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials': return 'The email or password is incorrect.';
    case 'email_not_confirmed': return 'Confirm your email before signing in.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Check the email address and try again.';
    case 'weak_password': return 'Choose a stronger password.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Too many attempts. Wait a moment and try again.';
    case 'otp_expired': return 'That code is invalid or expired. Request a new one.';
    default: return fallback;
  }
}
