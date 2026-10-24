import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InrideMark } from '@/components/InrideMark';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/context/AuthContext';

const background = require('@/assets/images/login-bg.jpg');

const ACCENT = '#2fd4e6';

const SLIDES: Array<{ line1: string; line2: string }> = [
  { line1: 'Viaja seguro, rápido', line2: 'y sin complicaciones.' },
  { line1: 'Descubre el mundo', line2: 'con INRIDE.' },
  { line1: 'Conductores verificados', line2: 'en toda La Laguna.' },
];

type Sheet = 'none' | 'login' | 'register';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, role, isReady, configured, login, docsComplete } = useAuth();
  const [slide, setSlide] = useState(0);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  if (!isReady || (user && !role)) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={ACCENT} />
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

  const openSheet = (next: Sheet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setSheet(next);
  };

  const enterWithForm = async () => {
    setError(null);
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
      setSheet('none');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Credenciales inválidas');
    } finally {
      setBusy(false);
    }
  };

  const goRegister = (as: 'passenger' | 'driver') => {
    setSheet('none');
    router.push(`/register?role=${as}` as never);
  };

  const current = SLIDES[slide];
  const canLogin = email.trim().length > 3 && password.length > 0 && !busy;

  return (
    <ImageBackground source={background} style={styles.screen} resizeMode="cover">
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(8,30,25,0.55)', 'rgba(8,30,25,0.05)', 'rgba(5,20,16,0.85)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <InrideMark size={150} tone="light" />
          <Text style={styles.line1}>{current.line1}</Text>
          <Text style={styles.line2}>{current.line2}</Text>
        </View>

        <View style={styles.bottom}>
          {!configured ? (
            <View style={styles.warning}>
              <Feather name="alert-triangle" size={14} color="#f0b562" />
              <Text style={styles.warningText}>
                Falta configurar Supabase (.env). Ver supabase/README.md
              </Text>
            </View>
          ) : null}

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Pressable key={i} onPress={() => setSlide(i)} hitSlop={8}>
                <View style={[styles.dot, i === slide && styles.dotActive]} />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => openSheet('login')}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <View style={{ width: 22 }} />
            <Text style={styles.primaryText}>Iniciar sesión</Text>
            <Feather name="arrow-right" size={22} color="#0b1f1a" />
          </Pressable>

          <Pressable
            onPress={() => openSheet('register')}
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
          >
            <Text style={styles.outlineText}>Crear cuenta</Text>
          </Pressable>

          <Text style={styles.legal}>
            Al continuar, aceptas nuestros{'\n'}
            <Text style={styles.legalLink} onPress={() => void Linking.openURL(TERMS_URL)}>
              Términos y condiciones
            </Text>
            {'  y  '}
            <Text style={styles.legalLink} onPress={() => void Linking.openURL(PRIVACY_URL)}>
              Política de privacidad
            </Text>
          </Text>
        </View>
      </SafeAreaView>

      <Modal
        visible={sheet === 'login'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('none')}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !busy && setSheet('none')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Iniciar sesión</Text>
            <Text style={styles.sheetSub}>Qué gusto verte de nuevo</Text>

            <View style={styles.field}>
              <Feather name="mail" size={18} color="#8fb5aa" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#6f8f86"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Feather name="lock" size={18} color="#8fb5aa" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                placeholder="Contraseña"
                placeholderTextColor="#6f8f86"
                style={styles.input}
                onSubmitEditing={() => canLogin && void enterWithForm()}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8fb5aa" />
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={!canLogin}
              onPress={() => void enterWithForm()}
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.sheetBtn,
                !canLogin && { opacity: 0.55 },
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#0b1f1a" style={{ flex: 1 }} />
              ) : (
                <>
                  <View style={{ width: 22 }} />
                  <Text style={styles.primaryText}>Entrar</Text>
                  <Feather name="arrow-right" size={22} color="#0b1f1a" />
                </>
              )}
            </Pressable>

            <Pressable onPress={() => openSheet('register')} style={styles.switchRow}>
              <Text style={styles.switchText}>
                ¿No tienes cuenta? <Text style={styles.switchLink}>Crear cuenta</Text>
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={sheet === 'register'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('none')}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet('none')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Crear cuenta</Text>
            <Text style={styles.sheetSub}>¿Cómo quieres usar INRIDE?</Text>

            <Pressable
              onPress={() => goRegister('passenger')}
              style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
            >
              <View style={styles.roleIcon}>
                <Feather name="user" size={22} color="#0b1f1a" />
              </View>
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Soy pasajero</Text>
                <Text style={styles.roleSub}>Pide viajes en Torreón, Gómez y Lerdo</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8fb5aa" />
            </Pressable>

            <Pressable
              onPress={() => goRegister('driver')}
              style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
            >
              <View style={[styles.roleIcon, { backgroundColor: '#ffffff' }]}>
                <Feather name="navigation" size={22} color="#0b1f1a" />
              </View>
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Quiero manejar</Text>
                <Text style={styles.roleSub}>Gana dinero con tu auto</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8fb5aa" />
            </Pressable>

            <Pressable onPress={() => openSheet('login')} style={styles.switchRow}>
              <Text style={styles.switchText}>
                ¿Ya tienes cuenta? <Text style={styles.switchLink}>Iniciar sesión</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#0f2a24',
    flex: 1,
    justifyContent: 'center',
  },
  screen: { backgroundColor: '#0f2a24', flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 56 },
  line1: {
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
    fontSize: 24,
    letterSpacing: -0.3,
    marginTop: 26,
    textAlign: 'center',
  },
  line2: {
    color: ACCENT,
    fontFamily: 'Inter_500Medium',
    fontSize: 24,
    letterSpacing: -0.3,
    marginTop: 2,
    textAlign: 'center',
  },
  bottom: { gap: 14, paddingBottom: 8, paddingHorizontal: 24 },
  warning: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  warningText: { color: '#f5d9b0', flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  dots: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 6 },
  dot: { backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 6, height: 10, width: 10 },
  dotActive: { backgroundColor: ACCENT },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  primaryText: { color: '#0b1f1a', fontFamily: 'Inter_700Bold', fontSize: 17 },
  outlineBtn: {
    alignItems: 'center',
    borderColor: ACCENT,
    borderRadius: 32,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
  },
  outlineText: { color: ACCENT, fontFamily: 'Inter_700Bold', fontSize: 17 },
  pressed: { opacity: 0.82 },
  legal: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  legalLink: {
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  sheetOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f2a24',
    borderColor: 'rgba(47,212,230,0.18)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    gap: 12,
    paddingBottom: 36,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    height: 5,
    marginBottom: 8,
    width: 44,
  },
  sheetTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 24 },
  sheetSub: { color: '#8fb5aa', fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 6 },
  field: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  input: {
    color: '#ffffff',
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    paddingVertical: 15,
  },
  error: { color: '#ff8a80', fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  sheetBtn: { marginTop: 6 },
  switchRow: { alignItems: 'center', paddingVertical: 8 },
  switchText: { color: '#8fb5aa', fontFamily: 'Inter_400Regular', fontSize: 14 },
  switchLink: { color: ACCENT, fontFamily: 'Inter_700Bold' },
  roleCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  roleIcon: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  roleSub: { color: '#8fb5aa', fontFamily: 'Inter_400Regular', fontSize: 12 },
});
