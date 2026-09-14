import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRideChat } from '@/hooks/useRideChat';
import { useColors } from '@/hooks/useColors';

const QUICK = ['Ya voy', 'Estoy afuera', 'Un momento'];

type RideChatButtonProps = {
  rideId: string;
  meId: string;
  peerName: string;
};

export function RideChatButton({ rideId, meId, peerName }: RideChatButtonProps) {
  const colors = useColors();
  const chat = useRideChat(rideId, meId);

  return (
    <>
      <Pressable
        accessibilityLabel="Abrir mensajes"
        onPress={() => chat.setOpen(true)}
        style={styles.round}
      >
        <Feather name="message-circle" size={18} color={colors.primary} />
        {chat.unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chat.unread > 9 ? '9+' : chat.unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <RideChatSheet
        visible={chat.open}
        peerName={peerName}
        messages={chat.messages}
        meId={meId}
        sending={chat.sending}
        onClose={() => chat.setOpen(false)}
        onSend={chat.send}
      />
    </>
  );
}

function RideChatSheet({
  visible,
  peerName,
  messages,
  meId,
  sending,
  onClose,
  onSend,
}: {
  visible: boolean;
  peerName: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
  meId: string;
  sending: boolean;
  onClose: () => void;
  onSend: (body: string) => Promise<void>;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState('');

  const submit = async (text: string) => {
    const next = text.trim();
    if (!next || sending) return;
    setDraft('');
    try {
      await onSend(next);
    } catch (error) {
      setDraft(next);
      console.warn(error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Mensajes</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Con {peerName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.close}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                Coordina el punto de encuentro. Solo ustedes dos ven este chat.
              </Text>
            }
            renderItem={({ item }) => {
              const mine = item.senderId === meId;
              return (
                <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: mine ? colors.primary : colors.muted },
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: mine ? '#ffffff' : colors.foreground }]}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.quickRow}>
            {QUICK.map((label) => (
              <Pressable
                key={label}
                onPress={() => void submit(label)}
                style={[styles.quick, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.quickText, { color: colors.primary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje"
              placeholderTextColor={colors.mutedForeground}
              maxLength={400}
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            />
            <Pressable
              onPress={() => void submit(draft)}
              disabled={sending || !draft.trim()}
              style={[styles.send, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.45 }]}
            >
              <Feather name="send" size={16} color="#ffffff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  round: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#c2410c',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 4,
    top: 4,
  },
  badgeText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,27,23,0.35)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: 360,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#d5e3db',
    borderRadius: 3,
    height: 4,
    marginBottom: 10,
    width: 42,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  close: { padding: 8 },
  list: { flexGrow: 1, gap: 8, paddingVertical: 16 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, paddingVertical: 24 },
  bubbleWrap: { flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-end' },
  theirsWrap: { justifyContent: 'flex-start' },
  bubble: { borderRadius: 16, maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 9 },
  bubbleText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 19 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quick: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  composer: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingBottom: 8 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
});
