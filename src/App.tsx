/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Camera,
  Layers,
  Presentation,
  Mic,
  MicOff,
  Sliders,
  Video,
  FileText,
  Share2,
  Square,
  RotateCcw,
  Pause,
  Play,
  HelpCircle,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  RecordingMode,
  CameraShape,
  CameraSize,
  PipPosition,
  AnnotationTool,
  AnnotationStroke,
  WhiteboardTheme,
  RecordedLesson,
  TeleprompterConfig,
  TeacherBadgeConfig,
  CameraVisualConfig,
} from './types';
import { createAudioMixer, AudioMixerOutput } from './utils/audioMixer';
import {
  getAllRecordedLessons,
  saveRecordedLesson,
  deleteRecordedLesson,
  saveRecoveryChunk,
  getRecoverySessions,
  getRecoveryChunks,
  clearRecoverySession,
} from './utils/indexedDb';
import { RecorderCanvas } from './components/RecorderCanvas';
import { AnnotationToolbar } from './components/AnnotationToolbar';
import { CameraControls } from './components/CameraControls';
import { WhiteboardControls } from './components/WhiteboardControls';
import { TeleprompterModal } from './components/TeleprompterModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { RecordingsLibraryModal } from './components/RecordingsLibraryModal';
import { CountdownOverlay } from './components/CountdownOverlay';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Mode: Screen + Camera, Screen Only, Camera Only, Whiteboard + Camera
  const [mode, setMode] = useState<RecordingMode>('screen_cam');

  // Media Streams
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioMixer, setAudioMixer] = useState<AudioMixerOutput | null>(null);

  // Device settings
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);

  // Front Camera PiP Configuration
  const [cameraShape, setCameraShape] = useState<CameraShape>('circle');
  const [cameraSize, setCameraSize] = useState<CameraSize>('md');
  const [isCameraMirrored, setIsCameraMirrored] = useState<boolean>(true);
  const [pipPosition, setPipPosition] = useState<PipPosition>({ x: 74, y: 64 });
  const [teacherBadge, setTeacherBadge] = useState<TeacherBadgeConfig>({
    enabled: true,
    teacherName: 'Teacher Demo',
    subjectTitle: 'Interactive Lesson',
  });
  const [isCameraControlsOpen, setIsCameraControlsOpen] = useState<boolean>(false);
  const [cameraVisuals, setCameraVisuals] = useState<CameraVisualConfig>({
    brightness: 100,
    contrast: 108,
    saturation: 106,
    clarityMode: 'crisp_hd',
    resolution: '1080p',
    backgroundBlur: 'none',
    blurRadius: 14,
    focusRadius: 65,
    virtualBackdrop: 'none',
    chromaKeyEnabled: false,
    chromaKeyColor: 'green',
    chromaKeyTolerance: 38,
    chromaKeySoftness: 18,
    chromaKeySpill: 12,
    aiBackgroundRemoval: false,
    aiEngine: 'realtime',
    aiQuality: 'quality',
    aiBackgroundMode: 'transparent',
    aiBackgroundBlur: 16,
    aiEdgeFeather: 35,
    borderColor: 'none',
    borderWidth: 0,
    glowEffect: false,
    speakingRing: false,
    zoom: 1.0,
    panY: 0,
    colorTone: 'natural',
  });
  const [isScreenPromptDismissed, setIsScreenPromptDismissed] = useState<boolean>(false);

  // Whiteboard Configuration
  const [whiteboardTheme, setWhiteboardTheme] = useState<WhiteboardTheme>('blackboard');
  const [customSlideUrl, setCustomSlideUrl] = useState<string | null>(null);
  const [isWhiteboardControlsOpen, setIsWhiteboardControlsOpen] = useState<boolean>(false);

  // Annotations & Tools (TeachRecord style)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('cursor');
  const [currentColor, setCurrentColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [isToolbarCompact, setIsToolbarCompact] = useState<boolean>(false);

  // Teleprompter & Lesson Script
  const [teleprompter, setTeleprompter] = useState<TeleprompterConfig>({
    isOpen: false,
    text: `Welcome students to today's interactive lesson!\n\n1. Review homework questions\n2. Introduce today's primary formula\n3. Walk through step-by-step example on the board\n4. Q&A and wrap-up notes\n\nSpeak clearly into the microphone and highlight key concepts on screen!`,
    fontSize: 20,
    speed: 2,
    isScrolling: false,
    opacity: 0.95,
  });

  // Recording State Machine
  const [recordingState, setRecordingState] = useState<
    'idle' | 'countdown' | 'recording' | 'paused'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recoverySessionRef = useRef<string | null>(null);
  const recoveryChunkIndexRef = useRef(0);

  // Modals & Storage
  const [reviewLesson, setReviewLesson] = useState<RecordedLesson | null>(null);
  const [savedLessons, setSavedLessons] = useState<RecordedLesson[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load recordings and offer recovery for an interrupted recording. Chunks are
  // persisted locally while recording, so a renderer crash or accidental reload
  // does not automatically destroy a long lecture.
  useEffect(() => {
    getAllRecordedLessons().then((lessons) => setSavedLessons(lessons));
    getRecoverySessions().then(async (sessions) => {
      if (!sessions.length) return;
      const latest = sessions.sort((a, b) => b.createdAt - a.createdAt)[0];
      const recover = window.confirm(
        `TeachRecord found an interrupted recording (${latest.chunks} saved chunks). Recover it to your local library?`,
      );
      if (!recover) {
        for (const session of sessions) await clearRecoverySession(session.sessionId);
        return;
      }
      const chunks = await getRecoveryChunks(latest.sessionId);
      if (!chunks.length) return;
      const blob = new Blob(
        chunks.map((c) => c.blob),
        { type: latest.mimeType || chunks[0].mimeType },
      );
      const blobUrl = URL.createObjectURL(blob);
      const recovered: RecordedLesson = {
        id: `recovered-${Date.now()}`,
        title: `Recovered Lesson - ${new Date(latest.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        createdAt: latest.createdAt,
        duration: Math.max(1, latest.chunks * 2),
        sizeBytes: blob.size,
        mimeType: blob.type,
        blob,
        blobUrl,
        thumbnailUrl: '',
        notes: 'Recovered automatically after an interrupted recording.',
      };
      await saveRecordedLesson(recovered);
      await clearRecoverySession(latest.sessionId);
      const lessons = await getAllRecordedLessons();
      setSavedLessons(lessons);
      setReviewLesson(recovered);
      setStatusMessage({ text: 'Interrupted recording recovered successfully.', type: 'success' });
    });
  }, []);

  // Enumerate Audio & Video Devices
  const updateDeviceList = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setVideoDevices(cams);
      setAudioDevices(mics);
      if (cams.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cams[0].deviceId);
      }
      if (mics.length > 0 && !selectedMicId) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch (e) {
      console.warn('Unable to enumerate devices', e);
    }
  }, [selectedCameraId, selectedMicId]);

  // Request Front Camera Stream
  const initCamera = useCallback(
    async (deviceId?: string, res: '1080p' | '720p' | '480p' = '1080p') => {
      try {
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
        }

        let widthIdeal = 1920;
        let heightIdeal = 1080;
        if (res === '720p') {
          widthIdeal = 1280;
          heightIdeal = 720;
        } else if (res === '480p') {
          widthIdeal = 854;
          heightIdeal = 480;
        }

        let stream: MediaStream | null = null;
        try {
          const constraints: MediaStreamConstraints = {
            video: deviceId
              ? {
                  deviceId: { exact: deviceId },
                  width: { ideal: widthIdeal },
                  height: { ideal: heightIdeal },
                }
              : {
                  facingMode: 'user',
                  width: { ideal: widthIdeal },
                  height: { ideal: heightIdeal },
                },
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (errHigh) {
          console.warn('High resolution video failed, fallback to standard stream:', errHigh);
          const fallbackConstraints: MediaStreamConstraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
          };
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }

        setCameraStream(stream);
        updateDeviceList();
        return stream;
      } catch (err) {
        console.warn('Camera permission or device error:', err);
        setStatusMessage({
          text: 'Front camera access was not granted or is unavailable.',
          type: 'info',
        });
        return null;
      }
    },
    [cameraStream, updateDeviceList],
  );

  // Request Microphone Stream
  const initMicrophone = useCallback(
    async (deviceId?: string) => {
      try {
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
        }
        const constraints: MediaStreamConstraints = {
          audio: deviceId
            ? { deviceId: { exact: deviceId } }
            : { echoCancellation: true, noiseSuppression: true },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setMicStream(stream);
        updateDeviceList();
        return stream;
      } catch (err) {
        console.warn('Microphone permission or device error:', err);
        setStatusMessage({ text: 'Microphone access is not available.', type: 'info' });
        return null;
      }
    },
    [micStream, updateDeviceList],
  );

  // Request Screen Share Stream
  const startScreenShare = async () => {
    try {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true, // Capture tab / system audio if user opts in
      });

      // Handle user stopping screen share via native browser bar
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
      };

      setScreenStream(stream);
      setStatusMessage({ text: 'Screen shared successfully!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
      return stream;
    } catch (err) {
      console.warn('Screen share canceled or error:', err);
      return null;
    }
  };

  // Switch or Initialize devices when mode changes
  useEffect(() => {
    // If mode requires camera, initialize camera
    if (mode === 'screen_cam' || mode === 'camera_only' || mode === 'whiteboard_cam') {
      if (!cameraStream) {
        initCamera(selectedCameraId);
      }
    }
    // Initialize mic by default for teaching lectures
    if (!micStream) {
      initMicrophone(selectedMicId);
    }
  }, [mode, cameraStream, micStream, selectedCameraId, selectedMicId, initCamera, initMicrophone]);

  // Setup Audio Mixer and Live VU Meter loop
  useEffect(() => {
    if (!micStream && !screenStream) return;

    const mixer = createAudioMixer(micStream, screenStream);
    setAudioMixer(mixer);

    // VU meter poll
    const vuInterval = setInterval(() => {
      const vol = mixer.getVolumeLevel();
      setMicVolume(vol);
    }, 80);

    return () => {
      clearInterval(vuInterval);
      mixer.cleanup();
    };
  }, [micStream, screenStream]);

  // Synchronize mic mute state with mixer
  useEffect(() => {
    if (audioMixer) {
      audioMixer.setMicMuted(isMicMuted);
    }
  }, [isMicMuted, audioMixer]);

  // Switch Camera Device
  const handleSelectCameraDevice = (devId: string) => {
    setSelectedCameraId(devId);
    initCamera(devId, cameraVisuals.resolution);
  };

  // Switch Camera Resolution
  const handleChangeResolution = (res: '1080p' | '720p' | '480p') => {
    setCameraVisuals((prev) => ({ ...prev, resolution: res }));
    initCamera(selectedCameraId, res);
  };

  // Switch Mic Device
  const handleSelectMicDevice = (devId: string) => {
    setSelectedMicId(devId);
    initMicrophone(devId);
  };

  // Recording Timer loop
  useEffect(() => {
    if (recordingState === 'recording') {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [recordingState]);

  // Global Keyboard Shortcuts (TeachRecord hotkeys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        setIsMicMuted((prev) => !prev);
        return;
      }
      if (e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        setTeleprompter((prev) => ({ ...prev, isOpen: !prev.isOpen }));
        return;
      }
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        setIsCameraControlsOpen((prev) => !prev);
        return;
      }
      if (e.code === 'Space' && (recordingState === 'recording' || recordingState === 'paused')) {
        e.preventDefault();
        handleTogglePause();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoStroke();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setCurrentTool('cursor');
          break;
        case 'p':
          setCurrentTool('pen');
          break;
        case 'h':
          setCurrentTool('highlighter');
          break;
        case 'l':
          setCurrentTool('laser');
          break;
        case 's':
          setCurrentTool('spotlight');
          break;
        case 'a':
          setCurrentTool('arrow');
          break;
        case 'b':
          setCurrentTool('rect');
          break;
        case 'c':
          setCurrentTool('circle');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case '?':
          setIsShortcutsOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // handleTogglePause is intentionally omitted: it is redefined every render
    // and closes over `mediaRecorder`, which is already a dependency here, so
    // this effect re-subscribes with a fresh, non-stale closure whenever the
    // recorder instance actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingState, mediaRecorder]);

  // Start Recording workflow (3-2-1 countdown)
  const handleTriggerRecording = () => {
    // If in screen mode and no screen stream is active, prompt to share screen first
    if ((mode === 'screen_cam' || mode === 'screen_only') && !screenStream) {
      startScreenShare().then((str) => {
        if (str) {
          setRecordingState('countdown');
        }
      });
      return;
    }
    setRecordingState('countdown');
  };

  // Actual recording start after countdown
  const startActualRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Recording canvas not ready.');
      setRecordingState('idle');
      return;
    }

    try {
      // 1. Capture stream from canvas at 30 fps
      const canvasStream = canvas.captureStream(30);

      // 2. Mix in audio tracks from audio mixer
      const tracksToRecord: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      if (audioMixer && audioMixer.combinedStream.getAudioTracks().length > 0) {
        tracksToRecord.push(...audioMixer.combinedStream.getAudioTracks());
      } else if (micStream && micStream.getAudioTracks().length > 0) {
        tracksToRecord.push(...micStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracksToRecord);

      // 3. Supported MIME types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      recordedChunksRef.current = [];
      recoverySessionRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      recoveryChunkIndexRef.current = 0;
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5500000,
        audioBitsPerSecond: 160000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          const sessionId = recoverySessionRef.current;
          if (sessionId) {
            const index = recoveryChunkIndexRef.current++;
            void saveRecoveryChunk({
              sessionId,
              index,
              blob: event.data,
              mimeType,
              createdAt: Date.now(),
            });
          }
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(fullBlob);

        // Capture thumbnail from canvas
        const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

        const newLesson: RecordedLesson = {
          id: Math.random().toString(36).substring(2, 10),
          title: `Lesson - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          createdAt: Date.now(),
          duration: elapsedSeconds || 1,
          sizeBytes: fullBlob.size,
          mimeType,
          blob: fullBlob,
          blobUrl,
          thumbnailUrl: thumbnail,
        };

        // Auto-save to library and open review player
        saveRecordedLesson(newLesson).then(() => {
          const sessionId = recoverySessionRef.current;
          if (sessionId) void clearRecoverySession(sessionId);
          recoverySessionRef.current = null;
          getAllRecordedLessons().then(setSavedLessons);
        });
        setReviewLesson(newLesson);
        setRecordingState('idle');
        setElapsedSeconds(0);
      };

      recorder.start(2000); // 2s slices balance recovery durability and storage overhead
      setMediaRecorder(recorder);
      setRecordingState('recording');
      setElapsedSeconds(0);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      alert(
        'Could not start video recording: ' + (err instanceof Error ? err.message : String(err)),
      );
      setRecordingState('idle');
    }
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (!mediaRecorder) return;
    if (recordingState === 'recording') {
      mediaRecorder.pause();
      setRecordingState('paused');
    } else if (recordingState === 'paused') {
      mediaRecorder.resume();
      setRecordingState('recording');
    }
  };

  // Restart recording (trash current take and restart without stopping)
  const handleRestartRecording = () => {
    if (confirm('Trash this recording take and restart from zero?')) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        // detach onstop so it doesn't open modal
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      if (recoverySessionRef.current) void clearRecoverySession(recoverySessionRef.current);
      recoverySessionRef.current = null;
      setRecordingState('countdown');
      setElapsedSeconds(0);
      recordedChunksRef.current = [];
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  // Drawing stroke handlers
  const handleAddStroke = (stroke: AnnotationStroke) => {
    setStrokes((prev) => [...prev, stroke]);
  };

  const handleUndoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClearStrokes = () => {
    setStrokes([]);
  };

  // Delete lesson from library
  const handleDeleteLesson = async (id: string) => {
    await deleteRecordedLesson(id);
    const updated = await getAllRecordedLessons();
    setSavedLessons(updated);
    if (reviewLesson?.id === id) {
      setReviewLesson(null);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="teach-record-app"
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100"
    >
      {/* 3-2-1 TeachRecord Countdown */}
      {recordingState === 'countdown' && <CountdownOverlay onComplete={startActualRecording} />}

      {/* Top Application Header */}
      <header className="flex-shrink-0 h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between z-30">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-md shadow-rose-500/20">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">TeachRecord</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                TeachRecord Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Teaching & Lecture Video Recorder
            </p>
          </div>
        </div>

        {/* Mode Selector (4-in-1 Modes) */}
        <div className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            id="mode-screen-cam"
            onClick={() => setMode('screen_cam')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'screen_cam'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers size={14} />
            <span>Screen + Cam</span>
          </button>
          <button
            id="mode-screen-only"
            onClick={() => setMode('screen_only')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'screen_only'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Monitor size={14} />
            <span>Screen Only</span>
          </button>
          <button
            id="mode-camera-only"
            onClick={() => setMode('camera_only')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'camera_only'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera size={14} />
            <span>Cam Only</span>
          </button>
          <button
            id="mode-whiteboard-cam"
            onClick={() => setMode('whiteboard_cam')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'whiteboard_cam'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Presentation size={14} />
            <span>Board Studio</span>
          </button>
        </div>

        {/* Right Tools & Audio Level Meter */}
        <div className="flex items-center gap-2">
          {/* Live VU Audio Level Meter */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/70 border border-slate-800 rounded-xl">
            <button
              id="btn-toggle-mic"
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-1 rounded-md transition-colors ${
                isMicMuted ? 'text-rose-400 bg-rose-950/50' : 'text-emerald-400 hover:bg-slate-800'
              }`}
              title={isMicMuted ? 'Microphone is muted' : 'Microphone is active'}
            >
              {isMicMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* VU Meter Bars */}
            <div className="flex items-end gap-0.5 h-4 w-12" title={`Mic Volume: ${micVolume}%`}>
              {[...Array(6)].map((_, i) => {
                const threshold = (i + 1) * 16;
                const isLit = !isMicMuted && micVolume >= threshold;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-xs transition-all duration-75 ${
                      isLit
                        ? i < 4
                          ? 'bg-emerald-400 h-full'
                          : i === 4
                            ? 'bg-amber-400 h-full'
                            : 'bg-rose-500 h-full'
                        : 'bg-slate-800 h-1'
                    }`}
                  />
                );
              })}
            </div>

            {/* Mic device switcher */}
            {audioDevices.length > 1 && (
              <select
                id="select-mic-device"
                value={selectedMicId}
                onChange={(e) => handleSelectMicDevice(e.target.value)}
                className="bg-transparent text-[11px] text-slate-400 border-none outline-none cursor-pointer max-w-[90px] truncate"
              >
                {audioDevices.map((d, idx) => (
                  <option
                    key={d.deviceId || idx}
                    value={d.deviceId}
                    className="bg-slate-900 text-slate-200"
                  >
                    {d.label || `Mic ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Front Cam Settings toggle */}
          {(mode === 'screen_cam' || mode === 'whiteboard_cam' || mode === 'camera_only') && (
            <div className="flex items-center gap-1.5">
              {!cameraStream && (
                <button
                  id="btn-enable-camera-header"
                  onClick={() => initCamera(selectedCameraId, cameraVisuals.resolution)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  title="Front camera is off or blocked. Click to start camera."
                >
                  <Camera size={13} className="animate-pulse" />
                  <span className="hidden sm:inline">Enable Cam</span>
                </button>
              )}
              <button
                id="btn-open-cam-settings"
                onClick={() => setIsCameraControlsOpen(!isCameraControlsOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isCameraControlsOpen
                    ? 'bg-slate-800 border-rose-500/60 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title="Camera clarity filters, anti-blur presets, shape, and badge"
              >
                <Sliders size={14} />
                <span className="hidden sm:inline">Cam Clarity & Style</span>
              </button>
            </div>
          )}

          {/* Whiteboard Theme settings */}
          {mode === 'whiteboard_cam' && (
            <button
              id="btn-open-board-settings"
              onClick={() => setIsWhiteboardControlsOpen(!isWhiteboardControlsOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isWhiteboardControlsOpen
                  ? 'bg-slate-800 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Presentation size={14} />
              <span className="hidden sm:inline">Board Theme</span>
            </button>
          )}

          {/* Teleprompter toggle */}
          <button
            id="btn-toggle-teleprompter"
            onClick={() => setTeleprompter((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              teleprompter.isOpen
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Teleprompter & Script reader"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Script</span>
          </button>

          {/* Recordings Library Drawer Button */}
          <button
            id="btn-open-recordings-library"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-all"
            title="My Saved Lessons"
          >
            <Video size={14} className="text-rose-400" />
            <span className="hidden sm:inline">Lectures</span>
            {savedLessons.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {savedLessons.length}
              </span>
            )}
          </button>

          {/* Desktop App & Offline .EXE Installer */}
          <PWAInstallButton />

          {/* Quick Help / Shortcuts Button */}
          <button
            id="btn-open-shortcuts"
            onClick={() => setIsShortcutsOpen(true)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Teacher Shortcuts & Guide (?)"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* Status banner (e.g. screen shared successfully or permission info) */}
      {statusMessage && (
        <div
          className={`px-4 py-1.5 text-xs text-center border-b flex items-center justify-center gap-2 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
              : statusMessage.type === 'error'
                ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {statusMessage.type === 'error' && <AlertCircle size={14} />}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Interactive Teaching Recording Stage */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-4">
        {/* Canvas Engine */}
        <RecorderCanvas
          mode={mode}
          screenStream={screenStream}
          cameraStream={cameraStream}
          cameraShape={cameraShape}
          cameraSize={cameraSize}
          isCameraMirrored={isCameraMirrored}
          pipPosition={pipPosition}
          onChangePipPosition={setPipPosition}
          teacherBadge={teacherBadge}
          whiteboardTheme={whiteboardTheme}
          customSlideUrl={customSlideUrl}
          currentTool={currentTool}
          currentColor={currentColor}
          strokeWidth={strokeWidth}
          strokes={strokes}
          onAddStroke={handleAddStroke}
          canvasRef={canvasRef}
          cameraVisuals={cameraVisuals}
          micVolume={micVolume}
          onSwitchMode={setMode}
          onStartScreenShare={startScreenShare}
        />

        {/* Screen Share Prompt Banner when in screen mode but screen not selected yet */}
        {(mode === 'screen_cam' || mode === 'screen_only') &&
          !screenStream &&
          !isScreenPromptDismissed && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
                <Share2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">
                Ready to Teach? Select Your Screen
              </h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Choose your lecture presentation, browser window, or slides. If you prefer to record
                yourself full-screen without sharing your desktop, choose Full Camera Only!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-start-screen-share"
                  onClick={startScreenShare}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold shadow-xl shadow-rose-500/30 hover:scale-102 transition-all cursor-pointer"
                >
                  <Monitor size={16} />
                  <span>Share Screen / Window</span>
                </button>
                <button
                  id="btn-switch-to-cam-only"
                  onClick={() => setMode('camera_only')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-sm font-semibold shadow-xl hover:scale-102 transition-all cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Full Camera Only (Record Face)</span>
                </button>
                <button
                  id="btn-switch-to-whiteboard"
                  onClick={() => setMode('whiteboard_cam')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium border border-slate-700 transition-all cursor-pointer"
                >
                  <Presentation size={16} />
                  <span>Teaching Blackboard</span>
                </button>
              </div>
              <button
                onClick={() => setIsScreenPromptDismissed(true)}
                className="text-xs text-slate-400 hover:text-slate-200 underline mt-4 cursor-pointer"
              >
                Minimize and preview stage & camera bubble
              </button>
            </div>
          )}

        {/* Floating Annotation Toolbar (Docked at top/bottom center) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <AnnotationToolbar
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            currentColor={currentColor}
            onSelectColor={setCurrentColor}
            strokeWidth={strokeWidth}
            onChangeStrokeWidth={setStrokeWidth}
            onUndo={handleUndoStroke}
            onClear={handleClearStrokes}
            canUndo={strokes.length > 0}
            isCompact={isToolbarCompact}
            onToggleCompact={() => setIsToolbarCompact(!isToolbarCompact)}
          />
        </div>

        {/* Floating Teleprompter Modal */}
        {teleprompter.isOpen && (
          <div className="absolute top-16 left-6 z-20">
            <TeleprompterModal
              config={teleprompter}
              onChangeConfig={(patch) => setTeleprompter((prev) => ({ ...prev, ...patch }))}
              onClose={() => setTeleprompter((prev) => ({ ...prev, isOpen: false }))}
            />
          </div>
        )}

        {/* Floating Camera Controls Panel */}
        {isCameraControlsOpen && (
          <div className="absolute top-16 right-6 z-20">
            <CameraControls
              shape={cameraShape}
              onChangeShape={setCameraShape}
              size={cameraSize}
              onChangeSize={setCameraSize}
              isMirrored={isCameraMirrored}
              onToggleMirror={() => setIsCameraMirrored(!isCameraMirrored)}
              position={pipPosition}
              onChangePosition={setPipPosition}
              badge={teacherBadge}
              onChangeBadge={setTeacherBadge}
              videoDevices={videoDevices}
              selectedDeviceId={selectedCameraId}
              onSelectDevice={handleSelectCameraDevice}
              visuals={cameraVisuals}
              onChangeVisuals={setCameraVisuals}
              onChangeResolution={handleChangeResolution}
              currentMode={mode}
              onSwitchMode={setMode}
              onClose={() => setIsCameraControlsOpen(false)}
            />
          </div>
        )}

        {/* Floating Whiteboard Controls Panel */}
        {isWhiteboardControlsOpen && mode === 'whiteboard_cam' && (
          <div className="absolute top-16 right-6 z-20">
            <WhiteboardControls
              theme={whiteboardTheme}
              onChangeTheme={setWhiteboardTheme}
              hasCustomBackground={Boolean(customSlideUrl)}
              onUploadBackground={(url) => setCustomSlideUrl(url)}
              onRemoveCustomBackground={() => setCustomSlideUrl(null)}
              onClose={() => setIsWhiteboardControlsOpen(false)}
            />
          </div>
        )}

        {/* Mobile Mode Switcher (Visible on small screens) */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-15 md:hidden flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setMode('screen_cam')}
            className={`p-2 rounded-lg text-xs ${mode === 'screen_cam' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
          >
            <Layers size={14} />
          </button>
          <button
            onClick={() => setMode('screen_only')}
            className={`p-2 rounded-lg text-xs ${mode === 'screen_only' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setMode('camera_only')}
            className={`p-2 rounded-lg text-xs ${mode === 'camera_only' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
          >
            <Camera size={14} />
          </button>
          <button
            onClick={() => setMode('whiteboard_cam')}
            className={`p-2 rounded-lg text-xs ${mode === 'whiteboard_cam' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
          >
            <Presentation size={14} />
          </button>
        </div>

        {/* Master Recording Bar (Docked at Bottom Center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          {recordingState === 'idle' ? (
            /* IDLE STATE: Big Red Start Button */
            <div
              id="recording-bar-idle"
              className="flex items-center gap-3 px-5 py-2.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in"
            >
              <button
                id="btn-start-recording"
                onClick={handleTriggerRecording}
                className="group flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/30 transition-all hover:scale-102 cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white group-hover:scale-125 transition-transform" />
                <span>Start Recording</span>
              </button>

              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-800 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Sparkles size={13} className="text-amber-400" /> 1080p HD
                </span>
                <span className="text-slate-500">Front Cam + Mic Mixed</span>
              </div>
            </div>
          ) : (
            /* ACTIVE RECORDING / PAUSED BAR */
            <div
              id="recording-bar-active"
              className="flex items-center gap-3 px-4 py-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in ring-2 ring-rose-500/30"
            >
              {/* Pulsing REC Indicator */}
              <div className="flex items-center gap-2 pl-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    recordingState === 'recording' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-200">
                  {recordingState === 'recording' ? 'REC' : 'PAUSED'}
                </span>
              </div>

              {/* Live Elapsed Timer */}
              <div className="px-3 py-1 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-sm font-semibold text-rose-400 tracking-wider">
                {formatTimer(elapsedSeconds)}
              </div>

              {/* Pause / Resume Button */}
              <button
                id="btn-pause-resume"
                onClick={handleTogglePause}
                title={recordingState === 'recording' ? 'Pause Recording' : 'Resume Recording'}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {recordingState === 'recording' ? <Pause size={17} /> : <Play size={17} />}
              </button>

              {/* Restart Take Button */}
              <button
                id="btn-restart-take"
                onClick={handleRestartRecording}
                title="Restart take from beginning"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <RotateCcw size={16} />
              </button>

              {/* Stop & Finish Button */}
              <button
                id="btn-stop-recording"
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Square size={14} className="fill-white" />
                <span>Finish Lecture</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Post-Recording Review & Trim Studio Modal */}
      {reviewLesson && (
        <VideoPlayerModal
          lesson={reviewLesson}
          onSaveToLibrary={(updated) => {
            saveRecordedLesson(updated).then(() => {
              getAllRecordedLessons().then(setSavedLessons);
            });
          }}
          onClose={() => setReviewLesson(null)}
        />
      )}

      {/* Saved Recordings Library Modal */}
      {isLibraryOpen && (
        <RecordingsLibraryModal
          lessons={savedLessons}
          onSelectLesson={(lesson) => {
            setReviewLesson(lesson);
            setIsLibraryOpen(false);
          }}
          onDeleteLesson={handleDeleteLesson}
          onClose={() => setIsLibraryOpen(false)}
        />
      )}

      {/* Teacher Shortcuts & Guide Modal */}
      {isShortcutsOpen && (
        <div
          id="shortcuts-guide-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Teacher Shortcuts & TeachRecord Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    Essential hotkeys for smooth lecture delivery
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Pen Tool</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-rose-300">
                  P
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Highlighter</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300">
                  H
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Laser Pointer</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-rose-400">
                  L
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Screen Spotlight</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-sky-300">
                  S
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Arrow Pointer</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  A
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Highlight Box</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  B
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Mouse Cursor</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  V
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Undo Stroke</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  Ctrl+Z
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Pause / Resume</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  Space
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Mute Microphone</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                  Alt+M
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Teleprompter</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300">
                  Alt+T
                </kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300">Camera Styling</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-rose-300">
                  Alt+C
                </kbd>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200/90 space-y-1">
              <span className="font-semibold text-rose-300">Pro Educator Tip:</span>
              <p>
                You can drag the front camera bubble anywhere on the screen at any point. All live
                drawings, annotations, and camera moves are baked into your final video!
              </p>
            </div>

            {/* Offline & Desktop Tip */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-emerald-400">100% Offline & Desktop:</span>
              <p>
                Click <strong className="text-white">Desktop App (.exe)</strong> in the top header
                to install directly to Windows or build an offline standalone desktop executable.
              </p>
            </div>

            <button
              onClick={() => setIsShortcutsOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Got it, let's record!
            </button>
          </div>
        </div>
      )}

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
