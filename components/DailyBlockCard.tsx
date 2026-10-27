import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@/constants/pricing';
import {
  fetchMyDailyBlocks,
  formatBlockDay,
  localDay,
  payDailyBlockWithBalance,
  type DailyBlock,
} from '@/lib/api/blocks';
import { startDepositPayment } from '@/lib/api/payments';
import { fetchMyPayoutBalance } from '@/lib/api/payouts';
import { supabase } from '@/lib/supabase';

export type DailyBlocksState = {
  blocks: DailyBlock[];
  /** Bloque generado hoy (pendiente o pagado), si ya juntó el monto. */
  today: DailyBlock | null;
  /** Bloques de días anteriores sin pagar: mientras haya, no puede aceptar viajes. */
  overdue: DailyBlock[];
  loaded: boolean;
  refresh: () => Promise<DailyBlock[]>;
};

export function useDailyBlocks(driverId: string | undefined, todayEarnings: number): DailyBlocksState {
  const [blocks, setBlocks] = useState<DailyBlock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [day, setDay] = useState(localDay());

  const refresh = useCallback(async () => {
    if (!driverId) return [];
    const next = await fetchMyDailyBlocks(driverId);
    setBlocks(next);
    setLoaded(true);
    setDay(localDay());
    return next;
  }, [driverId]);

  useEffect(() => {
    void refresh();
  }, [refresh, todayEarnings]);

  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`daily-blocks-${driverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_daily_blocks', filter: `driver_id=eq.${driverId}` },
        () => void refresh(),
      )
      .subscribe();
    const timer = setInterval(() => void refresh(), 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [driverId, refresh]);

  return useMemo(() => {
    const today = blocks.find((b) => b.day === day) ?? null;
    const overdue = blocks
      .filter((b) => b.status === 'pending' && b.day < day)
      .sort((a, b) => a.day.localeCompare(b.day));
    return { blocks, today, overdue, loaded, refresh };
  }, [blocks, day, loaded, refresh]);
}

const METHOD_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  balance: 'saldo de tarjeta',
  admin: 'oficina',
};

export function DailyBlockCard({
  state,
  fee,
  todayEarnings,
}: {
  state: DailyBlocksState;
  fee: number;
  todayEarnings: number;
}) {
  const { today, overdue, loaded, refresh } = state;
  const due = overdue[0] ?? (today?.status === 'pending' ? today : null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState<'mp' | 'balance' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!due) return;
    fetchMyPayoutBalance()
      .then((b) => setBalance(b.balance))
      .catch(() => setBalance(null));
  }, [due?.id]);

  useEffect(() => {
    setMessage(null);
  }, [due?.id]);

  const waitPaid = async (blockId: string) => {
    for (let i = 0; i < 10; i += 1) {
      const list = await refresh();
      const b = list.find((x) => x.id === blockId);
      if (b && b.status !== 'pending') return true;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  };

  const payMp = async () => {
    if (!due || busy) return;
    setBusy('mp');
    setMessage(null);
    try {
      const { alreadyPaid } = await startDepositPayment(due.id);
      const ok = alreadyPaid ? (await refresh(), true) : await waitPaid(due.id);
      if (ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMessage({ tone: 'ok', text: '¡Bloque pagado! Gracias.' });
      } else {
        setMessage({
          tone: 'info',
          text: 'Si completaste el pago, Mercado Pago lo confirmará en unos minutos (OXXO puede tardar más).',
        });
      }
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo abrir Mercado Pago' });
    } finally {
      setBusy(null);
    }
  };

  const payBalance = () => {
    if (!due || busy) return;
    Alert.alert(
      'Pagar con tu saldo',
      `Se descontarán ${formatMoney(due.amount)} de tu saldo de viajes con tarjeta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            setBusy('balance');
            setMessage(null);
            try {
              await payDailyBlockWithBalance(due.id);
              await refresh();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setMessage({ tone: 'ok', text: '¡Bloque pagado con tu saldo!' });
            } catch (e) {
              setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'No se pudo pagar' });
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  if (!loaded) return null;

  const feedback = message ? (
    <Text
      style={[
        styles.message,
        { color: message.tone === 'ok' ? '#138a68' : message.tone === 'error' ? '#d64545' : '#6d7c75' },
      ]}
    >
      {message.text}
    </Text>
  ) : null;

  if (!due) {
    if (today) {
      return (
        <View style={styles.paidRow}>
          <Feather name="check-circle" size={16} color="#138a68" />
          <Text style={styles.paidText}>
            Bloque de hoy {today.status === 'waived' ? 'condonado' : 'pagado'}
            {today.method ? ` · ${METHOD_LABEL[today.method] ?? today.method}` : ''}
          </Text>
          {feedback}
        </View>
      );
    }
    const progress = Math.min(1, todayEarnings / Math.max(fee, 1));
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.title}>Bloque del día · {formatMoney(fee)}</Text>
          <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.copy}>
          {progress >= 1
            ? 'Ya juntaste tu bloque de hoy. En un momento te aparece el botón para pagarlo.'
            : `Llevas ${formatMoney(todayEarnings)} hoy. Cuando juntes ${formatMoney(fee)} te aparecerá el botón para pagar tu bloque.`}
        </Text>
      </View>
    );
  }

  const isOverdue = overdue.length > 0;
  const canUseBalance = balance !== null && balance + 0.001 >= due.amount;

  return (
    <View style={[styles.card, isOverdue ? styles.cardOverdue : styles.cardDue]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: isOverdue ? '#fdecec' : '#fff3db' }]}>
          <Feather name={isOverdue ? 'alert-circle' : 'award'} size={18} color={isOverdue ? '#c24141' : '#c27a12'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isOverdue ? 'Bloque pendiente de pago' : '¡Juntaste tu bloque de hoy!'}
          </Text>
          <Text style={styles.sub}>
            {formatBlockDay(due.day)} · {formatMoney(due.amount)}
          </Text>
        </View>
      </View>
      <Text style={styles.copy}>
        {isOverdue
          ? overdue.length > 1
            ? `Tienes ${overdue.length} bloques sin pagar. Págalos para volver a recibir viajes.`
            : 'Págalo para volver a recibir viajes.'
          : `Ya ganaste ${formatMoney(due.earned)} hoy. Paga tu bloque antes de que termine el día para seguir recibiendo viajes mañana.`}
      </Text>

      <Pressable
        onPress={() => void payMp()}
        disabled={Boolean(busy)}
        style={[styles.btn, styles.mpBtn, busy && { opacity: 0.75 }]}
      >
        {busy === 'mp' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="credit-card" size={16} color="#fff" />
            <Text style={styles.btnText}>Pagar {formatMoney(due.amount)} con Mercado Pago</Text>
          </>
        )}
      </Pressable>

      {canUseBalance ? (
        <Pressable
          onPress={payBalance}
          disabled={Boolean(busy)}
          style={[styles.btn, styles.balanceBtn, busy && { opacity: 0.75 }]}
        >
          {busy === 'balance' ? (
            <ActivityIndicator color="#138a68" />
          ) : (
            <Text style={[styles.btnText, { color: '#138a68' }]}>
              Usar mi saldo de tarjeta ({formatMoney(balance ?? 0)})
            </Text>
          )}
        </Pressable>
      ) : null}

      {feedback}
      {message?.tone === 'info' ? (
        <Pressable onPress={() => void refresh()} hitSlop={8}>
          <Text style={styles.link}>Ya pagué, verificar</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>¿Prefieres pagar en efectivo? Acude a la oficina y lo registramos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e9e5',
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
    padding: 16,
  },
  cardDue: { backgroundColor: '#fffaf0', borderColor: '#f1c77a' },
  cardOverdue: { backgroundColor: '#fff6f6', borderColor: '#e8a3a3' },
  head: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  icon: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  title: { color: '#10221c', flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15 },
  sub: { color: '#6d7c75', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  pct: { color: '#6d7c75', fontFamily: 'Inter_700Bold', fontSize: 12 },
  copy: { color: '#5c6b64', fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  track: { backgroundColor: '#e8efe9', borderRadius: 100, height: 8, overflow: 'hidden' },
  fill: { backgroundColor: '#138a68', height: '100%' },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 46,
  },
  mpBtn: { backgroundColor: '#009ee3' },
  balanceBtn: { backgroundColor: '#ffffff', borderColor: '#bfe3d2', borderWidth: 1 },
  btnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  message: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  link: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 13 },
  hint: { color: '#8a9790', fontFamily: 'Inter_500Medium', fontSize: 11 },
  paidRow: {
    alignItems: 'center',
    backgroundColor: '#eef8f3',
    borderRadius: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paidText: { color: '#0f3d2e', flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
