const source = require('@/assets/sounds/new-ride.wav');

type Player = {
  volume: number;
  loop: boolean;
  seekTo: (seconds: number) => Promise<void>;
  play: () => void;
};

let player: Player | null = null;
let failed = false;

/** Timbre corto de tres notas. Suena una vez por viaje nuevo, sin bucle. */
export async function playNewRideChime() {
  if (failed) return;
  try {
    const { createAudioPlayer, setAudioModeAsync } = await import('expo-audio');
    if (!player) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
      });
      player = createAudioPlayer(source);
    }
    player.volume = 0.7;
    player.loop = false;
    await player.seekTo(0);
    player.play();
  } catch (error) {
    failed = true;
    console.warn(error);
  }
}
