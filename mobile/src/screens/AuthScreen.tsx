import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { LoginRobot } from '../components/LoginRobot';
import {
  AuthUser,
  getGoogleConfig,
  googleLogin,
  login,
  setToken,
  signup,
} from '../services/authApi';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onAuthenticated: (user: AuthUser) => void;
}

type Mood = 'idle' | 'watching' | 'secret' | 'success' | 'error';

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('idle');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: googleClientId || 'studyforge-not-configured.apps.googleusercontent.com',
      webClientId: googleClientId || 'studyforge-not-configured.apps.googleusercontent.com',
      scopes: ['openid', 'profile', 'email'],
      responseType: 'id_token',
    },
  );

  useEffect(() => {
    getGoogleConfig().then((config) => setGoogleClientId(config.google_client_id)).catch(() => {
      // Email sign-in remains available when Google is not configured on the server.
    });
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') {
        setError('Google sign-in was cancelled or could not be completed.');
        setMood('error');
      }
      return;
    }
    const credential = response.params?.id_token;
    if (!credential) {
      setError('Google did not return a sign-in token. Please try again.');
      setMood('error');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    googleLogin(credential)
      .then(async ({ token, user }) => {
        await setToken(token);
        setMood('success');
        onAuthenticated(user);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
        setMood('error');
      })
      .finally(() => setGoogleLoading(false));
  }, [onAuthenticated, response]);

  const message = error
    ? error
    : mood === 'secret'
      ? 'A secret? I’ll look away.'
      : mood === 'success'
        ? 'Access granted. Welcome to StudyForge.'
        : mood === 'watching'
          ? 'I’m listening. Keep going.'
          : mode === 'signup'
            ? 'New study space detected. Let’s make it yours.'
            : 'Beep boop. Who goes there?';

  const changeMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError(null);
    setMood('idle');
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      setMood('error');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const requestFn = mode === 'signup' ? signup : login;
      const { token, user } = await requestFn(email.trim().toLowerCase(), password);
      await setToken(token);
      setMood('success');
      onAuthenticated(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setMood('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scene} keyboardShouldPersistTaps="handled">
          <View style={styles.stage}>
            <LoginRobot mood={mood} message={message} />
            <View style={styles.card}>
              <View style={styles.hands} aria-hidden>
                <View style={styles.hand} />
                <View style={styles.hand} />
              </View>
              <Text style={styles.brand}>STUDYFORGE / 01</Text>
              <Text style={styles.title}>{mode === 'signup' ? 'Build your study space.' : 'Your plan is waiting.'}</Text>
              <Text style={styles.sub}>{mode === 'signup' ? 'Create an account to save live estimates.' : 'Log in to continue where you left off.'}</Text>

              <View style={styles.switcher}>
                {(['login', 'signup'] as const).map((item) => (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === item }}
                    onPress={() => changeMode(item)}
                    style={[styles.switch, mode === item && styles.switchActive]}
                  >
                    <Text style={[styles.switchText, mode === item && styles.switchTextActive]}>
                      {item === 'login' ? 'Log in' : 'Sign up'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                accessibilityLabel="Email address"
                style={styles.input}
                value={email}
                onChangeText={(value) => { setEmail(value); setError(null); }}
                onFocus={() => setMood('watching')}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <Text style={styles.label}>PASSWORD{mode === 'signup' ? ' · 6+ CHARACTERS' : ''}</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  accessibilityLabel="Password"
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(value) => { setPassword(value); setError(null); }}
                  onFocus={() => setMood('secret')}
                  onBlur={() => setMood('idle')}
                  placeholder="Your password"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)} style={styles.peek}>
                  <Text style={styles.peekText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              <TouchableOpacity accessibilityRole="button" style={[styles.submit, loading && styles.disabled]} onPress={submit} disabled={loading || googleLoading} activeOpacity={0.82}>
                {loading ? <ActivityIndicator color={COLORS.paper} /> : <Text style={styles.submitText}>{mode === 'signup' ? 'CREATE ACCOUNT' : 'LOG ME IN'}</Text>}
              </TouchableOpacity>

              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.google, googleLoading && styles.disabled]}
                disabled={googleLoading}
                onPress={() => {
                  if (!googleClientId) {
                    setError('Google sign-in is not configured yet. You can use email and password.');
                    setMood('error');
                    return;
                  }
                  if (request) {
                    promptAsync().catch((e: unknown) => {
                      setError(e instanceof Error ? e.message : 'Google sign-in could not be started.');
                      setMood('error');
                    });
                  }
                }}
                activeOpacity={0.82}
              >
                {googleLoading ? <ActivityIndicator color={COLORS.ink} /> : <><View style={styles.googleMark}><Text style={styles.googleG}>G</Text></View><Text style={styles.googleText}>Continue with Google</Text></>}
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button" style={styles.toggle} onPress={() => changeMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={styles.toggleText}>{mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}</Text>
              </TouchableOpacity>
              <View style={styles.footRow}><View style={styles.foot} /><View style={styles.foot} /></View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const COLORS = { paper: '#f4efe5', ink: '#23252d', orange: '#e5532f', muted: '#9a948a', field: '#faf7f0', border: '#c6c0b4', white: '#fffdf8' };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.paper },
  flex: { flex: 1 },
  scene: { flexGrow: 1, backgroundColor: COLORS.paper, paddingHorizontal: 20, justifyContent: 'center' },
  stage: { alignItems: 'center', paddingVertical: 22 },
  card: { width: '100%', maxWidth: 360, position: 'relative', backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.ink, borderRadius: 14, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 36, shadowColor: COLORS.ink, shadowOffset: { width: 7, height: 8 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 },
  hands: { position: 'absolute', top: -16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  hand: { height: 31, width: 43, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.ink, borderRadius: 8 },
  brand: { color: COLORS.orange, fontSize: 11, fontWeight: '900', textAlign: 'center', letterSpacing: 1.5 },
  title: { color: COLORS.ink, fontSize: 23, fontWeight: '900', textAlign: 'center', letterSpacing: -0.6, marginTop: 8 },
  sub: { color: '#6c685f', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  switcher: { flexDirection: 'row', borderBottomWidth: 2, borderColor: COLORS.ink, marginBottom: 20 },
  switch: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  switchActive: { borderBottomColor: COLORS.orange },
  switchText: { color: '#8b857b', fontSize: 12, fontWeight: '900' },
  switchTextActive: { color: COLORS.ink },
  label: { color: '#5d5951', fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 2, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 13, backgroundColor: COLORS.field, color: COLORS.ink, fontSize: 14, fontWeight: '600', marginBottom: 14 },
  passwordWrap: { minHeight: 50, borderWidth: 2, borderColor: COLORS.border, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.field },
  passwordInput: { minWidth: 0, flex: 1, paddingHorizontal: 13, color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  peek: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  peekText: { color: COLORS.ink, fontSize: 11, fontWeight: '900' },
  error: { color: '#b33d2e', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 10 },
  submit: { minHeight: 52, backgroundColor: COLORS.orange, borderWidth: 2, borderColor: COLORS.ink, borderRadius: 8, marginTop: 18, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.ink, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  submitText: { color: COLORS.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { height: 1, flex: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  google: { minHeight: 50, borderWidth: 2, borderColor: COLORS.ink, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.white },
  googleMark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  googleG: { color: '#4285F4', fontSize: 18, fontWeight: '900' },
  googleText: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  toggle: { minHeight: 40, alignItems: 'center', justifyContent: 'flex-end' },
  toggleText: { color: COLORS.ink, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
  footRow: { position: 'absolute', bottom: -25, left: 60, right: 60, flexDirection: 'row', justifyContent: 'space-between', zIndex: -1 },
  foot: { height: 32, width: 54, borderWidth: 2, borderColor: COLORS.ink, borderRadius: 8, backgroundColor: COLORS.white },
});
