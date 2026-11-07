import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { useOffline } from '../../services/connectivity';
import { colors, spacing } from '../../theme';
import { AccountInput } from './AccountInput';
import { supabase } from './client';
import { authErrorMessage } from './errors';

type Mode = 'sign-in' | 'register' | 'verify';

export function AuthForm() {
  const offline = useOffline();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    setToken('');
    setError('');
    setMessage('');
  }

  async function run(action: 'submit' | 'resend') {
    if (!supabase || offline || working.current) return;
    const address = email.trim();
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (action === 'submit' && mode === 'verify' && !/^\d{6,10}$/.test(token.trim())) {
      setError('Enter the verification code from your email.');
      return;
    }
    if (action === 'submit' && mode !== 'verify' && (mode === 'register' ? password.length < 6 : !password)) {
      setError(mode === 'register' ? 'Use a password with at least six characters.' : 'Enter your password.');
      return;
    }

    working.current = true;
    setBusy(true);
    try {
      if (action === 'resend') {
        const result = await supabase.auth.resend({ type: 'signup', email: address });
        if (result.error) throw result.error;
        setMessage('A new confirmation email was requested.');
      } else if (mode === 'register') {
        const result = await supabase.auth.signUp({ email: address, password });
        if (result.error) throw result.error;
        setPassword('');
        if (!result.data.session) setMode('verify');
      } else if (mode === 'verify') {
        const result = await supabase.auth.verifyOtp({ email: address, token: token.trim(), type: 'email' });
        if (result.error) throw result.error;
        setToken('');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: address, password });
        if (result.error) throw result.error;
        setPassword('');
      }
    } catch (reason) {
      setError(authErrorMessage(reason, 'The account request did not finish. Try again.'));
      if (mode === 'sign-in' && reason && typeof reason === 'object' && 'code' in reason && reason.code === 'email_not_confirmed') {
        setMode('verify');
        setPassword('');
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  if (!supabase) {
    return <Text style={styles.hint}>Accounts aren’t connected yet. You can still use your library on this device.</Text>;
  }

  const verify = mode === 'verify';
  return (
    <View style={styles.form}>
      <Text style={styles.hint}>
        {verify
          ? 'Open the confirmation link in your email, then return to sign in. If your email includes a code, enter it here.'
          : 'Your guest library stays on this device and is separate from your account.'}
      </Text>
      {offline && <Text style={styles.hint}>Connect to the internet to use an account.</Text>}
      <AccountInput
        label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
        autoCorrect={false} autoComplete="email" editable={!busy && !verify}
      />
      {verify ? (
        <AccountInput
          label="Verification code" value={token} onChangeText={setToken} keyboardType="number-pad"
          autoComplete="one-time-code" maxLength={10} editable={!busy}
        />
      ) : (
        <AccountInput
          label="Password" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'} editable={!busy}
        />
      )}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text> : null}
      <Button
        label={busy ? 'Please wait…' : verify ? 'Verify code' : mode === 'register' ? 'Create account' : 'Sign in'}
        onPress={() => void run('submit')} disabled={busy || offline}
      />
      {verify && <Button label="Resend email" variant="outline" onPress={() => void run('resend')} disabled={busy || offline} />}
      <Button
        label={mode === 'sign-in' ? 'Create a new account' : 'Back to sign in'}
        variant="outline" disabled={busy} onPress={() => switchMode(mode === 'sign-in' ? 'register' : 'sign-in')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
});
