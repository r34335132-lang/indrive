import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type BoundaryState = { error: Error | null };

class MapLoadBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>El mapa no está en esta versión</Text>
          <Text style={styles.copy}>
            No se pudo cargar el mapa. Revisa tu conexión a internet e inténtalo de nuevo.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#138a68" />
    </View>
  );
}

export function LazyMapScreen({ Screen }: { Screen: ComponentType }) {
  return (
    <MapLoadBoundary>
      <Suspense fallback={<Loading />}>
        <Screen />
      </Suspense>
    </MapLoadBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: '#16362f',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    color: '#d7ebe4',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
