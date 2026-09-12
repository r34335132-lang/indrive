import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { DriverTier } from '@/constants/pricing';
import { DRIVER_TIER_LABELS } from '@/constants/pricing';

type Mode = 'passenger' | 'driver';

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { registerAsPassenger, registerAsDriver } = useAuth();

  const initialMode: Mode = params.role === 'driver' ? 'driver' : 'passenger';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverTier, setDriverTier] = useState<DriverTier>('go');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const base =
      name.trim().length > 2 &&
      email.includes('@') &&
      phone.trim().length >= 8 &&
      password.length >= 6;
    if (!base) return false;
    if (mode === 'passenger') return true;
    return (
      vehicleMake.trim().length > 1 &&
      vehicleModel.trim().length > 1 &&
      vehicleColor.trim().length > 1 &&
      vehiclePlate.trim().length > 3
    );
  }, [email, mode, name, password, phone, vehicleColor, vehicleMake, vehicleModel, vehiclePlate]);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setError(null);
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (mode === 'passenger') {
        await registerAsPassenger({ name, email, phone, password });
        router.replace('/(tabs)');
      } else {
        await registerAsDriver({
          name,
          email,
          phone,
          password,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          vehiclePlate,
          driverTier,
        });
        router.replace('/register-driver');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>CREAR CUENTA</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Registro inride</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('passenger')}
            style={[
              styles.modeChip,
              {
                backgroundColor: mode === 'passenger' ? colors.primary : colors.card,
                borderColor: mode === 'passenger' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ color: mode === 'passenger' ? '#fff' : colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Pasajero
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('driver')}
            style={[
              styles.modeChip,
              {
                backgroundColor: mode === 'driver' ? '#16362f' : colors.card,
                borderColor: mode === 'driver' ? '#16362f' : colors.border,
              },
            ]}
          >
            <Text style={{ color: mode === 'driver' ? '#fff' : colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Conductor
            </Text>
          </Pressable>
        </View>

        <Field label="Nombre completo" value={name} onChangeText={setName} colors={colors} placeholder="Ana López" />
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          colors={colors}
          placeholder="ana@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          colors={colors}
          placeholder="+52 618 000 0000"
          keyboardType="phone-pad"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          colors={colors}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />

        {mode === 'driver' ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>Vehículo</Text>
            <Field label="Marca" value={vehicleMake} onChangeText={setVehicleMake} colors={colors} placeholder="Toyota" />
            <Field label="Modelo" value={vehicleModel} onChangeText={setVehicleModel} colors={colors} placeholder="Corolla" />
            <Field label="Color" value={vehicleColor} onChangeText={setVehicleColor} colors={colors} placeholder="Verde" />
            <Field
              label="Placas"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              colors={colors}
              placeholder="NRA-218"
              autoCapitalize="characters"
            />

            <Text style={[styles.section, { color: colors.foreground }]}>Tipo de conductor</Text>
            <View style={styles.tierRow}>
              {(['go', 'plus', 'master'] as DriverTier[]).map((tier) => (
                <Pressable
                  key={tier}
                  onPress={() => setDriverTier(tier)}
                  style={[
                    styles.tierChip,
                    {
                      backgroundColor: driverTier === tier ? colors.secondary : colors.card,
                      borderColor: driverTier === tier ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                    {DRIVER_TIER_LABELS[tier]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Después subirás INE, licencia, circulación y seguro.
            </Text>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={!canSubmit || busy}
          onPress={submit}
          style={[
            styles.submit,
            { backgroundColor: canSubmit ? colors.primary : colors.border, opacity: busy ? 0.75 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'passenger' ? 'Crear cuenta pasajero' : 'Continuar a documentos'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  colors,
  ...props
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 12, paddingBottom: 36, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingTop: 4,
  },
  back: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  modeChip: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  field: { gap: 6 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  section: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 8 },
  tierRow: { flexDirection: 'row', gap: 8 },
  tierChip: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  error: { color: '#dc2626', fontFamily: 'Inter_500Medium', fontSize: 12 },
  submit: {
    alignItems: 'center',
    borderRadius: 15,
    marginTop: 8,
    paddingVertical: 16,
  },
  submitText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
