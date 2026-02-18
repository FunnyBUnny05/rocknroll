import { useState, useRef, useCallback } from 'react';
import type { TranscriptionProgress } from '../../services/basicPitchTranscriber';

const ACCEPTED_AUDIO = '.mp3,.wav,.flac,.ogg,.m4a,.aac,.webm';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  progress: TranscriptionProgress | null;
  isTranscribing: boolean;
}

/**
 * FileUpload - Drag-and-drop audio file upload component.
 * Triggers the AI transcription pipeline on file selection.
 */
export function FileUpload({
  onFileSelected,
  progress,
  isTranscribing,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const stageLabels: Record<string, string> = {
    loading: 'Loading audio...',
    separating: 'Separating tracks...',
    detecting: 'Detecting notes...',
    mapping: 'Mapping to guitar...',
    done: 'Done!',
  };

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
        isDragOver
          ? 'border-violet-500 bg-violet-500/10'
          : isTranscribing
          ? 'border-amber-500/50 bg-amber-500/5'
          : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        className="hidden"
        onChange={handleInputChange}
      />

      {isTranscribing && progress ? (
        /* Transcription progress */
        <div className="space-y-3">
          <div className="text-sm font-medium text-amber-400">
            {stageLabels[progress.stage] ?? 'Processing...'}
          </div>

          {/* Progress bar */}
          <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="text-xs text-gray-500">
            {Math.round(progress.percent)}% - {fileName}
          </div>
        </div>
      ) : (
        /* Upload prompt */
        <div
          className="cursor-pointer space-y-3"
          onClick={() => inputRef.current?.click()}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-800/80">
            <UploadIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">
              Drop an audio file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-600">
              MP3, WAV, FLAC, OGG, M4A (AI transcription powered by Basic Pitch)
            </p>
          </div>
          {fileName && !isTranscribing && (
            <div className="text-xs text-violet-400">
              Last: {fileName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-7 w-7 text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}
