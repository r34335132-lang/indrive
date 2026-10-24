export default {
  expo: {
    name: 'inride',
    slug: 'inride',
    owner: 'raulbri123',
    version: '1.0.8',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'inride',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.inridedgo.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'inride usa tu ubicación solo para mostrar la ruta del viaje y conectar pasajero con conductor mientras usas la app.',
        NSCameraUsageDescription:
          'inride usa la cámara para que el conductor se tome su foto de perfil (la ve el pasajero) y fotografíe sus documentos de verificación (INE, licencia, etc.).',
        NSPhotoLibraryUsageDescription:
          'inride accede a tus fotos únicamente para que el conductor elija su foto de perfil y sus documentos de verificación. No usamos tus fotos con otros fines.',
        NSPhotoLibraryAddUsageDescription:
          'inride no guarda fotos en tu galería; este permiso solo se declara por compatibilidad del selector de imágenes.',
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
    },
    android: {
      package: 'com.inride.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA'],
      // Documentos del conductor se eligen con el selector de fotos del sistema (Photo Picker),
      // que no requiere permisos de almacenamiento (política de Google Play, API 33+).
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      ],
      softwareKeyboardLayoutMode: 'resize',
    },
    web: {
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-image',
      'expo-splash-screen',
      'expo-web-browser',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Permite a inride usar tu ubicación durante el viaje para la navegación.',
          isAndroidBackgroundLocationEnabled: false,
          isIosBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'inride accede a tus fotos únicamente para que el conductor elija su foto de perfil y sus documentos de verificación. No usamos tus fotos con otros fines.',
          cameraPermission:
            'inride usa la cámara para que el conductor se tome su foto de perfil (la ve el pasajero) y fotografíe sus documentos de verificación (INE, licencia, etc.).',
          microphonePermission: false,
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: false,
          recordAudioAndroid: false,
          enableBackgroundPlayback: false,
          enableBackgroundRecording: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: '76423619-5492-4e6f-becc-313bba6886e1',
      },
      mapProvider: 'openstreetmap',
      privacyPolicyUrl:
        'https://bronze-homegrown-706.notion.site/Pol-tica-de-Privacidad-de-InRide-3e4621fdb4218081b774ed240384cf20',
      termsUrl:
        'https://bronze-homegrown-706.notion.site/T-rminos-y-Condiciones-de-InRide-3e4621fdb42180d2a365dd4bc3fcc858',
    },
  },
};
