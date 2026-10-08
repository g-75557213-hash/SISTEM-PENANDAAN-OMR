import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Crosshair,
  Target,
  Upload,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { optimizeImageForOMR } from '../utils/imageOptimizer';
import { findSixFiducialMarkers } from '../utils/omrFiducialDetector';

interface OMRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, autoGrade?: boolean) => void;
  targetClassName?: string;
}

interface MarkersDetectionState {
  topLeft: boolean;
  topRight: boolean;
  midLeft: boolean;
  midRight: boolean;
  botLeft: boolean;
  botRight: boolean;
  count: number;
}

export const OMRScannerModal: React.FC<OMRScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  targetClassName = '5 Cemerlang',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

  // Live 6-point detection states
  const [markersState, setMarkersState] = useState<MarkersDetectionState>({
    topLeft: false,
    topRight: false,
    midLeft: false,
    midRight: false,
    botLeft: false,
    botRight: false,
    count: 0,
  });

  const [stableConsecutiveFrames, setStableConsecutiveFrames] = useState(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);

  // Safe camera initialization
  async function initCamera() {
    try {
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Pelayar web ini tidak menyokong akses kamera secara langsung (WebRTC). Sila gunakan butang kamera peranti di bawah.'
        );
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play warning:', playErr);
        });
      }
    } catch (err: any) {
      console.warn('Camera access handled:', err?.name || err?.message || err);

      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission denied')
      ) {
        setCameraError(
          'Kebenaran kamera disekat oleh pelayar. Anda boleh klik "Buka Kamera Telefon / Foto" di bawah untuk mengambil foto tanpa halangan.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('Tiada perkakasan kamera dikesan pada peranti ini.');
      } else {
        setCameraError('Kamera tidak dapat diakses pada masa ini. Sila gunakan fungsi kamera peranti di bawah.');
      }
    }
  }

  // Handle snap from live video stream
  const handleSnap = async (isAuto = false) => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.94);
        const optimized = await optimizeImageForOMR(rawDataUrl);
        // Triggers automatic OMR grading if 6 points were aligned!
        onCapture(optimized, isAuto || markersState.count >= 5);
        onClose();
      }
    } catch (e) {
      console.warn('Error processing snapshot:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Real-time 6-point fiducial analysis loop
  useEffect(() => {
    if (!isOpen || cameraError || !stream) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    if (!scanCanvasRef.current) {
      scanCanvasRef.current = document.createElement('canvas');
      scanCanvasRef.current.width = 480;
      scanCanvasRef.current.height = 360;
    }

    const checkInterval = window.setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isCapturing) return;

      const video = videoRef.current;
      const canvas = scanCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw downscaled frame for ultra-fast CV analysis
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const detected = findSixFiducialMarkers(ctx, canvas.width, canvas.height);

      if (detected) {
        const newState: MarkersDetectionState = {
          topLeft: detected.topLeft.found,
          topRight: detected.topRight.found,
          midLeft: detected.midLeft.found,
          midRight: detected.midRight.found,
          botLeft: detected.botLeft.found,
          botRight: detected.botRight.found,
          count: detected.foundCount,
        };

        setMarkersState(newState);

        // Auto-Capture logic when all 6 points are successfully aligned
        if (newState.count === 6 && autoCaptureEnabled) {
          setStableConsecutiveFrames((prev) => {
            const next = prev + 1;
            if (next >= 2) {
              // 2 consecutive stable frames (~400ms steady alignment) -> trigger automatic snap!
              setAutoCaptureCountdown(0);
              setTimeout(() => {
                handleSnap(true);
              }, 120);
            }
            return next;
          });
        } else {
          setStableConsecutiveFrames(0);
          setAutoCaptureCountdown(null);
        }
      }
    }, 200);

    scanIntervalRef.current = checkInterval;

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isOpen, cameraError, stream, autoCaptureEnabled, isCapturing]);

  // Main lifecycle
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCameraError(null);
      setMarkersState({
        topLeft: false,
        topRight: false,
        midLeft: false,
        midRight: false,
        botLeft: false,
        botRight: false,
        count: 0,
      });
      return;
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  // Handle fallback native mobile camera or photo upload
  const handleNativeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await optimizeImageForOMR(file);
      if (optimized) {
        onCapture(optimized, true);
        onClose();
      }
    } catch (err) {
      console.warn('Error reading native camera image:', err);
    }
  };

  const toggleFacingMode = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const isAllSixAligned = markersState.count === 6;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between sm:justify-center sm:items-center p-0 sm:p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 sm:border sm:border-slate-800 sm:rounded-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Hidden Native Camera & File Input */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeFileChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-indigo-500/20 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-lg shadow-md shadow-indigo-950 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  Kamera Panduan 6 Titik Penjuru
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                    Auto-Semak
                  </span>
                </h2>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-bold hidden xs:inline">
                  {targetClassName}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-none">
                Sistem mengesan 6 titik guide pada kertas secara automatik untuk menyemak soalan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
            aria-label="Tutup Kamera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area with Live Fiducial Alignment Tracking */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px] sm:min-h-[460px]">
          {cameraError ? (
            /* Friendly Fallback View when WebRTC Permission is Denied */
            <div className="p-6 text-center max-w-md flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">
                Kamera Langsung Perlu Akses
              </h3>
              <p className="text-slate-300 text-xs mb-5 leading-relaxed max-w-xs">
                {cameraError}
              </p>

              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Buka Kamera Telefon / Foto
                </button>
                <button
                  type="button"
                  onClick={() => initCamera()}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Cuba Semula WebRTC
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-4 max-w-xs">
                Mengambil foto menggunakan kamera asal peranti anda dijamin berfungsi di semua telefon.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Shutter Flash Animation when capturing */}
              {isCapturing && (
                <div className="absolute inset-0 bg-white/40 animate-pulse z-30 pointer-events-none" />
              )}

              {/* 6 Point Optical Alignment Overlay */}
              <div
                className={`absolute inset-3 sm:inset-6 border-2 rounded-xl pointer-events-none flex flex-col justify-between p-2 select-none transition-all duration-300 ${
                  isAllSixAligned
                    ? 'border-emerald-400 shadow-[inset_0_0_24px_rgba(16,185,129,0.3)] bg-emerald-500/5'
                    : 'border-dashed border-purple-400/50'
                }`}
              >
                {/* 1. TOP ROW MARKERS */}
                <div className="flex justify-between items-start">
                  {/* Top-Left Fiducial Target */}
                  <div className="flex flex-col items-start gap-1">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 border-t-4 border-l-4 rounded-tl flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.topLeft
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 rounded flex items-center gap-0.5 ${
                        markersState.topLeft
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.topLeft ? '✔ ATAS KIRI' : '1. ATAS KIRI'}
                    </span>
                  </div>

                  {/* Top Center Guide Banner with Live Counter */}
                  <div
                    className={`backdrop-blur px-3 sm:px-4 py-1.5 rounded-full border text-center shadow-lg transition-all duration-300 flex items-center gap-2 ${
                      isAllSixAligned
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 animate-pulse'
                        : 'bg-slate-950/90 border-purple-400/60 text-purple-200'
                    }`}
                  >
                    <Target
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isAllSixAligned ? 'text-emerald-400 animate-spin' : 'text-purple-400'
                      }`}
                    />
                    <span className="text-[10px] sm:text-xs font-bold tracking-wide">
                      {isAllSixAligned
                        ? '6/6 TITIK SEJAJAR! MENYEMAK AUTOMATIK...'
                        : `${markersState.count}/6 Titik Dikesan — Sejajarkan Kertas`}
                    </span>
                  </div>

                  {/* Top-Right Fiducial Target */}
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 border-t-4 border-r-4 rounded-tr flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.topRight
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 rounded flex items-center gap-0.5 ${
                        markersState.topRight
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.topRight ? '✔ ATAS KANAN' : '2. ATAS KANAN'}
                    </span>
                  </div>
                </div>

                {/* 2. MIDDLE ROW MARKERS */}
                <div className="flex justify-between items-center w-full px-0.5">
                  {/* Mid-Left Fiducial Target */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 border-l-4 border-t-2 border-b-2 flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.midLeft
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded hidden xs:inline ${
                        markersState.midLeft
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.midLeft ? '✔ 3. TENGAH' : '3. TENGAH'}
                    </span>
                  </div>

                  {/* Middle Center Info */}
                  <div className="text-center font-mono text-[9px] sm:text-[10px] text-purple-200 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                    Piecewise Bi-Linear 6-Point Alignment
                  </div>

                  {/* Mid-Right Fiducial Target */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded hidden xs:inline ${
                        markersState.midRight
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.midRight ? '✔ 4. TENGAH' : '4. TENGAH'}
                    </span>
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 border-r-4 border-t-2 border-b-2 flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.midRight
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                  </div>
                </div>

                {/* 3. BOTTOM ROW MARKERS */}
                <div className="flex justify-between items-end">
                  {/* Bottom-Left Fiducial Target */}
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 rounded flex items-center gap-0.5 ${
                        markersState.botLeft
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.botLeft ? '✔ BAWAH KIRI' : '5. BAWAH KIRI'}
                    </span>
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 border-b-4 border-l-4 rounded-bl flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.botLeft
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                  </div>

                  {/* Alignment & Auto-Capture Toggle */}
                  <div className="pointer-events-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                      className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition flex items-center gap-1.5 border shadow-lg ${
                        autoCaptureEnabled
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70 shadow-emerald-950/40'
                          : 'bg-slate-900/90 text-slate-400 border-slate-700'
                      }`}
                      title="Togol tangkap automatik bila 6 titik lengkap"
                    >
                      <Zap className={`w-3 h-3 ${autoCaptureEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>{autoCaptureEnabled ? 'Auto-Semak Aktif' : 'Auto-Semak Mati'}</span>
                    </button>
                  </div>

                  {/* Bottom-Right Fiducial Target */}
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 rounded flex items-center gap-0.5 ${
                        markersState.botRight
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-black/80 text-yellow-300'
                      }`}
                    >
                      {markersState.botRight ? '✔ BAWAH KANAN' : '6. BAWAH KANAN'}
                    </span>
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 border-b-4 border-r-4 rounded-br flex items-center justify-center shadow-md transition-all duration-200 ${
                        markersState.botRight
                          ? 'border-emerald-400 bg-emerald-500/30 scale-105'
                          : 'border-yellow-400/80 bg-yellow-500/10'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black border-2 border-white shadow"></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Camera Controls */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border-t border-indigo-500/20 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Switch Camera */}
          <div className="w-20 sm:w-28 flex items-center justify-start">
            {!cameraError && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title="Tukar Kamera Hadapan/Belakang"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Tukar</span>
              </button>
            )}
          </div>

          {/* Center: Large Shutter / Capture Button */}
          <div className="flex-1 flex justify-center">
            {cameraError ? (
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="py-3 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Pilih Foto Kertas</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isCapturing}
                onClick={() => handleSnap(false)}
                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full p-1 flex items-center justify-center shadow-xl transition active:scale-90 focus:outline-none cursor-pointer ${
                  isAllSixAligned
                    ? 'ring-4 ring-emerald-400 bg-emerald-500 animate-pulse'
                    : 'bg-white'
                }`}
                aria-label="Tangkap Gambar"
                title={isAllSixAligned ? '6 Titik Sedia! Klik untuk semak sekarang' : 'Tangkap gambar'}
              >
                <div
                  className={`w-full h-full rounded-full border-2 border-white flex items-center justify-center text-white ${
                    isAllSixAligned
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                      : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600'
                  }`}
                >
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              </button>
            )}
          </div>

          {/* Right: Native Device Camera Fallback / Close */}
          <div className="w-20 sm:w-28 flex items-center justify-end gap-1.5">
            {!cameraError && (
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="Guna Kamera Peranti"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-2.5 text-slate-400 hover:text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
