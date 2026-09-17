export interface AudioMixerOutput {
  combinedStream: MediaStream;
  analyser: AnalyserNode | null;
  cleanup: () => void;
  setMicMuted: (muted: boolean) => void;
  getVolumeLevel: () => number; // 0 to 100
}

export function createAudioMixer(
  micStream: MediaStream | null,
  screenStream: MediaStream | null,
): AudioMixerOutput {
  const audioCtx = new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )();
  const destination = audioCtx.createMediaStreamDestination();

  let micGainNode: GainNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  const sources: MediaStreamAudioSourceNode[] = [];

  // Mic setup
  if (micStream && micStream.getAudioTracks().length > 0) {
    try {
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micGainNode = audioCtx.createGain();
      micGainNode.gain.value = 1.0;

      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.4;

      micSource.connect(micGainNode);
      micGainNode.connect(analyserNode);
      micGainNode.connect(destination);
      sources.push(micSource);
    } catch (e) {
      console.warn('Could not connect mic to audio context', e);
    }
  }

  // Screen audio setup (if user checked "Share system audio")
  if (screenStream && screenStream.getAudioTracks().length > 0) {
    try {
      const screenSource = audioCtx.createMediaStreamSource(screenStream);
      const screenGain = audioCtx.createGain();
      screenGain.gain.value = 1.0;

      screenSource.connect(screenGain);
      screenGain.connect(destination);
      sources.push(screenSource);
    } catch (e) {
      console.warn('Could not connect screen audio to audio context', e);
    }
  }

  const dataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

  return {
    combinedStream: destination.stream,
    analyser: analyserNode,
    setMicMuted: (muted: boolean) => {
      if (micGainNode) {
        micGainNode.gain.value = muted ? 0.0 : 1.0;
      }
      if (micStream) {
        micStream.getAudioTracks().forEach((track) => {
          track.enabled = !muted;
        });
      }
    },
    getVolumeLevel: () => {
      if (!analyserNode || !dataArray) return 0;
      analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Scale to roughly 0 - 100%
      return Math.min(100, Math.round((average / 128) * 100));
    },
    cleanup: () => {
      sources.forEach((s) => {
        try {
          s.disconnect();
        } catch (_) {
          /* ignore */
        }
      });
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    },
  };
}

/**
 * Play countdown beep tone (3, 2, 1, GO!)
 */
export function playCountdownTone(pitch: 'low' | 'high' = 'low') {
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = pitch === 'high' ? 880 : 440; // A5 for GO, A4 for 3, 2, 1

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + (pitch === 'high' ? 0.35 : 0.2),
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (pitch === 'high' ? 0.4 : 0.25));
  } catch (e) {
    console.debug('Tone audio could not play', e);
  }
}
