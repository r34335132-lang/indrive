const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default {
  expo: {
    name: 'inride',
    slug: 'inride',
    owner: 'rafafndz',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'inride',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#16362f',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.inridedgo.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'inride usa tu ubicación para mostrar la ruta del viaje y conectar pasajero con conductor.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'inride usa tu ubicación durante el viaje activo.',
      },
      ...(googleMapsApiKey
        ? {
            config: {
              googleMapsApiKey,
            },
          }
        : {}),
    },
    android: {
      package: 'com.inride.app',
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    web: {
      favicon: './assets/images/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Permite a inride usar tu ubicación durante el viaje.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: 'e8121bba-1975-4c9d-b21d-0072f3de8dc9',
      },
    },
  },
};
