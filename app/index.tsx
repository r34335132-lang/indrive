import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { DEMO_ACCOUNTS, isSupabaseConfigured } from '@/lib/supabase';

const logoSource = require('@/assets/images/inride-logo.png');

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, role, isReady, configured, login, loginAs, docsComplete } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user && role === 'passenger') {
    return <Redirect href="/(tabs)" />;
  }

  if (user && role === 'driver') {
    return <Redirect href={docsComplete ? '/driver' : '/register-driver'} />;
  }

  if (user && role === 'admin') {
    return <Redirect href="/admin" />;
  }

  const goAfterLogin = (nextRole: 'passenger' | 'driver' | 'admin') => {
    if (nextRole === 'driver') {
      router.replace('/driver');
      return;
    }
    if (nextRole === 'admin') {
      router.replace('/admin');
      return;
    }
    router.replace('/(tabs)');
  };

  const enterAs = async (as: 'passenger' | 'driver' | 'admin') => {
    setError(null);
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (!isSupabaseConfigured && !configured) {
        setError('Configura EXPO_PUBLIC_SUPABASE_URL y ANON_KEY en .env');
        return;
      }
      await loginAs(as);
      goAfterLogin(as);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const enterWithForm = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Credenciales inválidas');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient colors={['#16362f', '#1f4f43', '#138a68']} style={styles.hero}>
        <View style={styles.glow} />
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Movilidad confiable en Durango</Text>
        <Text style={styles.heroCopy}>
          Conectado a Supabase. Usa las cuentas demo en dos dispositivos Android.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {!configured ? (
          <View style={[styles.hint, { backgroundColor: '#fff4e8', borderColor: '#f0d2a8' }]}>
            <Feather name="alert-triangle" size={15} color="#d88d2e" />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Falta `.env` con URL y anon key de Supabase. Ver supabase/README.md
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Entrar como demo</Text>

        <Pressable
          testID="login-passenger"
          disabled={busy}
          onPress={() => enterAs('passenger')}
          style={({ pressed }) => [
            styles.roleCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={22} color={colors.primary} />
          </View>
          <View style={styles.roleCopy}>
            <Text style={[styles.roleTitle, { color: colors.foreground }]}>Pasajero</Text>
            <Text style={[styles.roleSubtitle, { color: colors.mutedForeground }]}>
              {DEMO_ACCOUNTS.passenger.email}
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.primary} />
        </Pressable>

        <Pressable
          testID="login-driver"
          disabled={busy}
          onPress={() => enterAs('driver')}
          style={({ pressed }) => [
            styles.roleCard,
            { backgroundColor: '#16362f', borderColor: '#16362f' },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: '#d8f1e4' }]}>
            <Feather name="navigation" size={22} color="#16362f" />
          </View>
          <View style={styles.roleCopy}>
            <Text style={[styles.roleTitle, { color: '#ffffff' }]}>Conductor</Text>
            <Text style={[styles.roleSubtitle, { color: '#c5edda' }]}>
              {DEMO_ACCOUNTS.driver.email}
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color="#c5edda" />
        </Pressable>

        <Pressable
          testID="login-admin"
          disabled={busy}
          onPress={() => enterAs('admin')}
          style={({ pressed }) => [
            styles.roleCard,
            { backgroundColor: colors.card, borderColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: '#fff1df' }]}>
            <Feather name="settings" size={22} color="#e49339" />
          </View>
          <View style={styles.roleCopy}>
            <Text style={[styles.roleTitle, { color: colors.foreground }]}>Administrador</Text>
            <Text style={[styles.roleSubtitle, { color: colors.mutedForeground }]}>
              {DEMO_ACCOUNTS.admin.email}
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.primary} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
          O con email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="correo@inride.app"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Contraseña"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        />
        <Pressable
          disabled={busy || !email || !password}
          onPress={enterWithForm}
          style={({ pressed }) => [
            styles.loginBtn,
            { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 },
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Iniciar sesión</Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Pressable
            onPress={() => router.push('/register?role=passenger' as never)}
            style={[styles.registerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[styles.registerText, { color: colors.foreground }]}>Registro pasajero</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/register?role=driver' as never)}
            style={[styles.registerBtn, { borderColor: '#16362f', backgroundColor: '#16362f' }]}
          >
            <Text style={[styles.registerText, { color: '#fff' }]}>Registro conductor</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.hint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Password demo: InrideDemo1! · Sofía puede cambiar a rol admin desde Perfil.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  safe: { flex: 1 },
  hero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 10,
    overflow: 'hidden',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  glow: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 120,
    height: 200,
    position: 'absolute',
    right: -60,
    top: -40,
    width: 200,
  },
  logo: { height: 84, marginBottom: 4, width: 84 },
  tagline: {
    color: '#b9ead0',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  heroCopy: {
    color: '#c5edda',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 320,
  },
  body: { flex: 1, gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 2 },
  roleCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  roleIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  roleSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  pressed: { opacity: 0.85 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loginBtn: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loginText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  registerRow: { flexDirection: 'row', gap: 10 },
  registerBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  registerText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  error: { color: '#dc2626', fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center' },
  hint: {
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    padding: 12,
  },
  hintText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
});
