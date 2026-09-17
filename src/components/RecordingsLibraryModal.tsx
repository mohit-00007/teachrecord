import React from 'react';
import {
  Video,
  Play,
  Download,
  Trash2,
  Clock,
  Calendar,
  HardDrive,
  X,
  FileVideo,
} from 'lucide-react';
import { RecordedLesson } from '../types';

interface RecordingsLibraryModalProps {
  lessons: RecordedLesson[];
  onSelectLesson: (lesson: RecordedLesson) => void;
  onDeleteLesson: (id: string) => void;
  onClose: () => void;
}

export const RecordingsLibraryModal: React.FC<RecordingsLibraryModalProps> = ({
  lessons,
  onSelectLesson,
  onDeleteLesson,
  onClose,
}) => {
  const formatDuration = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = (lesson: RecordedLesson, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = lesson.blobUrl || (lesson.blob ? URL.createObjectURL(lesson.blob) : '');
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (lesson.title || 'Lesson_Recording').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeTitle}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="recordings-library-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                My Recorded Lectures & Tutorials
              </h2>
              <p className="text-xs text-slate-400">
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} recorded in your
                local library
              </p>
            </div>
          </div>
          <button
            id="btn-close-library"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of recordings */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
          {lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <FileVideo size={30} />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Recorded Lessons Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Click &quot;Start Recording&quot; to record your screen, front camera, or whiteboard
                lecture. Your recordings will be saved right here!
              </p>
            </div>
          ) : (
            lessons.map((item) => (
              <div
                key={item.id}
                id={`lesson-card-${item.id}`}
                onClick={() => onSelectLesson(item)}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-24 h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:border-rose-500/50 transition-colors">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileVideo size={24} className="text-slate-600" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={20} className="text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-rose-400 transition-colors truncate">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock size={12} className="text-rose-400" />{' '}
                        {formatDuration(item.duration)}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar size={12} /> {formatDate(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <HardDrive size={12} /> {formatFileSize(item.sizeBytes)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate max-w-md italic">
                        &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={(e) => handleDownload(item, e)}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    title="Download Video File"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this recorded lecture from your library?')) {
                        onDeleteLesson(item.id);
                      }
                    }}
                    className="p-2 rounded-lg bg-slate-700/40 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete recording"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
