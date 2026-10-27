import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
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
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMyPayoutBalance,
  fetchMyPayouts,
  fetchPayoutAccount,
  savePayoutAccount,
  type Payout,
  type PayoutAccount,
  type PayoutBalance,
} from '@/lib/api/payouts';
import { bankFromClabe, cleanClabe, formatClabe, isValidClabe, maskClabe } from '@/lib/clabe';

/**
 * Cuenta CLABE del conductor y saldo por cobrar de viajes pagados con tarjeta (Mercado Pago).
 * `variant="nudge"` solo se muestra si todavía no registró su cuenta.
 */
export function DriverPayoutsCard({
  variant = 'full',
  editRequest = 0,
}: {
  variant?: 'full' | 'nudge';
  editRequest?: number;
}) {
  const { user } = useAuth();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [acc, bal, list] = await Promise.all([
      fetchPayoutAccount(user.id).catch(() => null),
      variant === 'full' ? fetchMyPayoutBalance().catch(() => null) : Promise.resolve(null),
      variant === 'full' ? fetchMyPayouts(user.id).catch(() => []) : Promise.resolve([]),
    ]);
    setAccount(acc);
    setBalance(bal);
    setPayouts(list);
    setLoaded(true);
  }, [user?.id, variant]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editRequest > 0) setEditing(true);
  }, [editRequest]);

  const editor = (
    <PayoutAccountModal
      visible={editing}
      account={account}
      defaultHolder={user?.name ?? ''}
      onClose={() => setEditing(false)}
      onSaved={(acc) => {
        setAccount(acc);
        setEditing(false);
      }}
    />
  );

  if (variant === 'nudge') {
    if (!loaded || account) return editor;
    return (
      <>
        <Pressable onPress={() => setEditing(true)} style={styles.nudge}>
          <View style={styles.nudgeIcon}>
            <Feather name="credit-card" size={18} color="#0f7458" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeTitle}>Agrega tu cuenta para recibir pagos</Text>
            <Text style={styles.nudgeSub}>
              Los viajes pagados con tarjeta te los transferimos a tu CLABE.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#0f7458" />
        </Pressable>
        {editor}
      </>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>PAGOS CON TARJETA</Text>
        <Pressable onPress={() => void load()} hitSlop={8}>
          <Feather name="refresh-cw" size={15} color="#6d7c75" />
        </Pressable>
      </View>
      {!loaded ? (
        <ActivityIndicator color="#138a68" style={{ marginVertical: 12 }} />
      ) : (
        <>
          <Text style={styles.balanceLabel}>Por cobrar</Text>
          <Text style={styles.balance}>{formatMoney(Math.max(0, balance?.balance ?? 0))}</Text>
          <Text style={styles.balanceHint}>
            {balance?.cardTrips ?? 0} viajes con tarjeta · ya transferido{' '}
            {formatMoney(balance?.paidOut ?? 0)}
          </Text>

          <View style={styles.divider} />

          {account ? (
            <Pressable onPress={() => setEditing(true)} style={styles.accountRow}>
              <View style={styles.bankIcon}>
                <Feather name="briefcase" size={16} color="#0f7458" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountTitle}>
                  {account.bankName} · {maskClabe(account.clabe)}
                </Text>
                <Text style={styles.accountSub}>{account.holderName}</Text>
              </View>
              <Text style={styles.link}>Cambiar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.addBtn}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Agregar cuenta CLABE</Text>
            </Pressable>
          )}

          {payouts.length ? (
            <View style={styles.history}>
              <Text style={styles.historyTitle}>Movimientos</Text>
              {payouts.slice(0, 5).map((p) => {
                const isBlock = p.kind === 'block_fee';
                return (
                  <View key={p.id} style={styles.historyRow}>
                    <Feather
                      name={isBlock ? 'shield' : 'arrow-down-left'}
                      size={14}
                      color={isBlock ? '#c27a12' : '#138a68'}
                    />
                    <Text style={styles.historyDate} numberOfLines={1}>
                      {new Date(p.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {isBlock ? ' · Bloque pagado con saldo' : p.reference ? ` · ${p.reference}` : ''}
                    </Text>
                    <Text style={[styles.historyAmount, isBlock && { color: '#c27a12' }]}>
                      {isBlock ? '−' : ''}
                      {formatMoney(p.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.footnote}>
            Los viajes en efectivo los cobras tú directamente. Lo que pagan con tarjeta llega a
            inride por Mercado Pago y te lo transferimos a tu cuenta.
          </Text>
        </>
      )}
      {editor}
    </View>
  );
}

function PayoutAccountModal({
  visible,
  account,
  defaultHolder,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account: PayoutAccount | null;
  defaultHolder: string;
  onClose: () => void;
  onSaved: (account: PayoutAccount) => void;
}) {
  const { user } = useAuth();
  const [holder, setHolder] = useState('');
  const [bank, setBank] = useState('');
  const [clabe, setClabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankTouched, setBankTouched] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setHolder(account?.holderName ?? defaultHolder);
    setBank(account?.bankName ?? '');
    setClabe(account?.clabe ?? '');
    setError(null);
    setBankTouched(Boolean(account));
  }, [visible, account, defaultHolder]);

  const digits = cleanClabe(clabe);
  const detected = bankFromClabe(digits);
  const complete = digits.length === 18;
  const valid = complete && isValidClabe(digits);

  useEffect(() => {
    if (detected && !bankTouched) setBank(detected);
  }, [detected, bankTouched]);

  const save = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await savePayoutAccount(user.id, { holderName: holder, bankName: bank, clabe: digits });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(saved);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.handle} />
              <View style={styles.sheetHead}>
                <View style={styles.bankIconLg}>
                  <Feather name="credit-card" size={20} color="#0f7458" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Cuenta para depósitos</Text>
                  <Text style={styles.sheetSub}>Aquí te transferimos tus viajes pagados con tarjeta</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} disabled={busy}>
                  <Feather name="x" size={22} color="#6d7c75" />
                </Pressable>
              </View>

              <Text style={styles.label}>CLABE interbancaria (18 dígitos)</Text>
              <TextInput
                value={formatClabe(clabe)}
                onChangeText={(v) => setClabe(cleanClabe(v))}
                keyboardType="number-pad"
                placeholder="012 180 00000000000 0"
                placeholderTextColor="#9aa8a1"
                maxLength={21}
                style={[
                  styles.input,
                  styles.clabeInput,
                  complete && !valid ? styles.inputError : null,
                  valid ? styles.inputOk : null,
                ]}
              />
              <Text style={[styles.help, complete && !valid ? { color: '#d64545' } : null]}>
                {complete
                  ? valid
                    ? `✓ CLABE válida${detected ? ` · ${detected}` : ''}`
                    : 'La CLABE no es válida, revisa los dígitos'
                  : `${digits.length}/18 · la encuentras en tu app del banco (Mercado Pago, Nu, BBVA…)`}
              </Text>

              <Text style={styles.label}>Banco</Text>
              <TextInput
                value={bank}
                onChangeText={(v) => {
                  setBankTouched(true);
                  setBank(v);
                }}
                placeholder="BBVA"
                placeholderTextColor="#9aa8a1"
                style={styles.input}
              />

              <Text style={styles.label}>Nombre del titular</Text>
              <TextInput
                value={holder}
                onChangeText={setHolder}
                placeholder="Como aparece en tu banco"
                placeholderTextColor="#9aa8a1"
                autoCapitalize="words"
                style={styles.input}
              />

              <View style={styles.notice}>
                <Feather name="lock" size={14} color="#0f7458" />
                <Text style={styles.noticeText}>
                  La cuenta debe estar a tu nombre. Solo tú y el equipo de inride pueden verla; con
                  la CLABE únicamente se puede depositar, no retirar.
                </Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={() => void save()}
                disabled={busy || !valid}
                style={[styles.primary, (busy || !valid) && { opacity: 0.55 }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar cuenta</Text>}
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe8e3',
    borderRadius: 22,
    borderWidth: 1,
    gap: 4,
    padding: 18,
  },
  head: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  balanceLabel: { color: '#6d7c75', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 8 },
  balance: { color: '#10221c', fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -0.8 },
  balanceHint: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12 },
  divider: { backgroundColor: '#e6ece9', height: 1, marginVertical: 12 },
  accountRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  bankIcon: {
    alignItems: 'center',
    backgroundColor: '#e3f4ec',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  accountTitle: { color: '#10221c', fontFamily: 'Inter_700Bold', fontSize: 14 },
  accountSub: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  link: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 13 },
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  addBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  history: { gap: 8, marginTop: 14 },
  historyTitle: { color: '#4b5a53', fontFamily: 'Inter_700Bold', fontSize: 12 },
  historyRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  historyDate: { color: '#4b5a53', flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  historyAmount: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 13 },
  footnote: { color: '#8a9790', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 12 },
  nudge: {
    alignItems: 'center',
    backgroundColor: '#eef8f3',
    borderColor: '#bfe3d2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  nudgeIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  nudgeTitle: { color: '#0f3d2e', fontFamily: 'Inter_700Bold', fontSize: 14 },
  nudgeSub: { color: '#3f6b5a', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  overlay: { backgroundColor: 'rgba(8,20,16,0.55)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  sheetContent: { gap: 8, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: 'center', backgroundColor: '#dfe8e3', borderRadius: 3, height: 5, width: 44 },
  sheetHead: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 8, marginTop: 6 },
  bankIconLg: {
    alignItems: 'center',
    backgroundColor: '#e3f4ec',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sheetTitle: { color: '#10221c', fontFamily: 'Inter_700Bold', fontSize: 18 },
  sheetSub: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  label: { color: '#4b5a53', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 6 },
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
  clabeInput: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 1 },
  inputError: { borderColor: '#e8a3a3' },
  inputOk: { borderColor: '#138a68' },
  help: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 11 },
  notice: {
    backgroundColor: '#eef8f3',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    padding: 12,
  },
  noticeText: { color: '#2f5c4b', flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  error: { color: '#d64545', fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center' },
  primary: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 15,
  },
  primaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
});
