import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul'];

export function VehicleEditorModal({
  visible,
  onClose,
  onUpdateDocs,
}: {
  visible: boolean;
  onClose: () => void;
  onUpdateDocs: () => void;
}) {
  const { user, updateVehicle } = useAuth();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMake(user?.vehicleMake ?? '');
    setModel(user?.vehicleModel ?? '');
    setColor(user?.vehicleColor ?? '');
    setPlate(user?.vehiclePlate ?? '');
    setError(null);
    setSaved(false);
  }, [visible, user?.vehicleMake, user?.vehicleModel, user?.vehicleColor, user?.vehiclePlate]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateVehicle({ make, model, color, plate });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="car-side" size={22} color="#138a68" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Mi vehículo</Text>
                  <Text style={styles.sub}>Así lo verán los pasajeros al aceptar un viaje</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} disabled={busy}>
                  <Feather name="x" size={22} color="#6d7c75" />
                </Pressable>
              </View>

              <View style={styles.row}>
                <Field label="Marca" value={make} onChange={setMake} placeholder="Nissan" />
                <Field label="Modelo" value={model} onChange={setModel} placeholder="Versa 2020" />
              </View>
              <Field label="Color" value={color} onChange={setColor} placeholder="Blanco" />
              <View style={styles.chips}>
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.chip, color === c && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, color === c && styles.chipTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Field
                label="Placas"
                value={plate}
                onChange={(v) => setPlate(v.toUpperCase())}
                placeholder="ABC-123-D"
                autoCapitalize="characters"
              />

              <View style={styles.notice}>
                <Feather name="info" size={15} color="#a66d16" />
                <Text style={styles.noticeText}>
                  Si cambiaste de auto, sube también la tarjeta de circulación y la póliza del nuevo
                  vehículo. Se revisarán antes de que vuelvas a recibir viajes.
                </Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {saved ? (
                <View style={styles.saved}>
                  <Feather name="check-circle" size={16} color="#138a68" />
                  <Text style={styles.savedText}>Vehículo actualizado</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void save()}
                disabled={busy}
                style={[styles.primary, busy && { opacity: 0.7 }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar vehículo</Text>}
              </Pressable>
              <Pressable onPress={onUpdateDocs} disabled={busy} style={styles.secondary}>
                <Feather name="file-text" size={15} color="#138a68" />
                <Text style={styles.secondaryText}>Actualizar documentos del vehículo</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoCapitalize?: 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9aa8a1"
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(8,20,16,0.55)', flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  content: { gap: 12, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: 'center', backgroundColor: '#dfe8e3', borderRadius: 3, height: 5, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 4, marginTop: 6 },
  icon: {
    alignItems: 'center',
    backgroundColor: '#e3f4ec',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: { color: '#10221c', fontFamily: 'Inter_700Bold', fontSize: 18 },
  sub: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  label: { color: '#4b5a53', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: {
    backgroundColor: '#f6f9f7',
    borderColor: '#dfe8e3',
    borderRadius: 14,
    borderWidth: 1,
    color: '#10221c',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  chip: {
    backgroundColor: '#f1f5f3',
    borderColor: '#dfe8e3',
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: '#e3f4ec', borderColor: '#138a68' },
  chipText: { color: '#4b5a53', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  chipTextOn: { color: '#0f7458' },
  notice: {
    backgroundColor: '#fff7e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  noticeText: { color: '#7a5413', flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  error: { color: '#d64545', fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center' },
  saved: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  savedText: { color: '#138a68', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  primary: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 16,
    marginTop: 4,
    paddingVertical: 15,
  },
  primaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  secondary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryText: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 13 },
});
