import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  Camera,
  Bookmark,
  Volume2,
  VolumeX,
  Scissors,
  Check,
  X,
  FileVideo,
  Clock,
  HardDrive,
} from 'lucide-react';
import { RecordedLesson } from '../types';

interface VideoPlayerModalProps {
  lesson: RecordedLesson;
  onSaveToLibrary: (updatedLesson: RecordedLesson) => void;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  lesson,
  onSaveToLibrary,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(lesson.duration || 0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [title, setTitle] = useState<string>(lesson.title);
  const [notes, setNotes] = useState<string>(lesson.notes || '');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Trim sliders (in seconds)
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(lesson.duration || 0);
  const [isTrimmingActive, setIsTrimmingActive] = useState<boolean>(false);

  useEffect(() => {
    if (lesson.duration) {
      setTrimEnd(lesson.duration);
    }
  }, [lesson.duration]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      // If current time is past trimEnd, loop back to trimStart
      if (currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // If trimming is active, pause when reaching trimEnd
    if (isTrimmingActive && time >= trimEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (isFinite(dur) && dur > 0) {
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleDownloadVideo = () => {
    if (!lesson.blobUrl && !lesson.blob) return;
    const url = lesson.blobUrl || (lesson.blob ? URL.createObjectURL(lesson.blob) : '');
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (title || 'Teaching_Lecture').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `Snapshot_${Math.round(currentTime)}s.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSave = () => {
    const updated: RecordedLesson = {
      ...lesson,
      title: title.trim() || 'Untitled Teaching Video',
      notes: notes.trim(),
      duration: isTrimmingActive ? Math.max(1, trimEnd - trimStart) : duration,
    };
    onSaveToLibrary(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div
      id="video-player-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileVideo size={18} />
            </div>
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter lesson title..."
                className="bg-transparent text-sm font-semibold text-slate-100 hover:bg-slate-800/60 focus:bg-slate-800 px-2 py-0.5 rounded border border-transparent focus:border-slate-600 focus:outline-none transition-colors w-72"
              />
              <div className="flex items-center gap-3 text-[11px] text-slate-400 pl-2">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {formatSeconds(duration)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive size={11} /> {formatFileSize(lesson.sizeBytes)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-modal-save-lesson"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isSaved ? <Check size={14} /> : <Bookmark size={14} />}
              <span>{isSaved ? 'Saved to Library' : 'Save to Library'}</span>
            </button>
            <button
              id="btn-modal-download-video"
              onClick={handleDownloadVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all"
            >
              <Download size={14} />
              <span>Download Video</span>
            </button>
            <button
              id="btn-modal-close"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Canvas & Player */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[500px]">
          <video
            ref={videoRef}
            src={lesson.blobUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            playsInline
          />

          {/* Floating play button when paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute w-16 h-16 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform pl-1"
            >
              <Play size={28} />
            </button>
          )}
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {/* Progress / Seek bar */}
          <div className="space-y-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Trimming Tool Drawer */}
          {isTrimmingActive && (
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5 text-amber-400">
                  <Scissors size={14} /> Trim Lecture Range
                </span>
                <span className="text-[11px] text-slate-400">
                  New Duration: {formatSeconds(Math.max(0, trimEnd - trimStart))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Start: {formatSeconds(trimStart)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, trimEnd - 0.5)}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrimStart(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full h-1.5 accent-amber-400 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>End: {formatSeconds(trimEnd)}</span>
                  </div>
                  <input
                    type="range"
                    min={trimStart + 0.5}
                    max={duration || 1}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrimEnd(val);
                    }}
                    className="w-full h-1.5 accent-amber-400 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Control Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                id="btn-review-play"
                onClick={togglePlay}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                id="btn-review-mute"
                onClick={() => {
                  if (!videoRef.current) return;
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 text-xs text-slate-300">
                {[0.75, 1, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                      playbackSpeed === spd ? 'bg-rose-500 text-white' : 'hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Trimmer toggle */}
              <button
                id="btn-toggle-trimmer"
                onClick={() => setIsTrimmingActive(!isTrimmingActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isTrimmingActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Scissors size={14} />
                <span>Trim</span>
              </button>

              {/* Snapshot frame button */}
              <button
                id="btn-review-snapshot"
                onClick={handleTakeSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-all"
                title="Download screenshot thumbnail of current frame"
              >
                <Camera size={14} />
                <span>Capture Frame</span>
              </button>
            </div>
          </div>

          {/* Notes / Description */}
          <div className="pt-2 border-t border-slate-800">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key takeaway notes or chapter marks for this lecture..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
