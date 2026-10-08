import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Crosshair, Target, Upload, CheckCircle2 } from 'lucide-react';
import { optimizeImageForOMR } from '../utils/imageOptimizer';

interface OMRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  targetClassName?: string;
}

export const OMRScannerModal: React.FC<OMRScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  targetClassName = '5 Cemerlang',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCornerAligned, setIsCornerAligned] = useState(false);

  // Safe camera initialization
  async function initCamera() {
    try {
      setCameraError(null);

      // Check if mediaDevices is supported in current context
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
      // Use console.warn to prevent noisy runtime triggers
      console.warn('Camera access handled:', err?.name || err?.message || err);

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.message?.includes('Permission denied')) {
        setCameraError(
          'Kebenaran kamera disekat oleh pelayar. Anda boleh klik "Kamera Peranti / Muat Naik" di bawah untuk mengambil foto tanpa kebenaran pelayar.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('Tiada perkakasan kamera dikesan pada peranti ini.');
      } else {
        setCameraError('Kamera tidak dapat diakses pada masa ini. Sila gunakan fungsi kamera peranti di bawah.');
      }
    }
  }

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setIsCornerAligned(false);
      setCameraError(null);
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

  // Handle snap from live video stream
  const handleSnap = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const optimized = await optimizeImageForOMR(rawDataUrl);
        onCapture(optimized);
        onClose();
      }
    } catch (e) {
      console.warn('Error processing snapshot:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle fallback native mobile camera or photo upload (100% bypasses WebRTC permission block)
  const handleNativeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await optimizeImageForOMR(file);
      if (optimized) {
        onCapture(optimized);
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

        {/* Modal Header - Mobile Compact */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-indigo-500/20 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-lg shadow-md shadow-indigo-950 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Kamera Panduan 4 Sudut
                </h2>
                <span className="text-[10px] font-mono bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                  {targetClassName}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-none">
                Sejajarkan 4 kotak hitam di penjuru kertas fizikal
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

        {/* Viewfinder Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px] sm:min-h-[460px]">
          {cameraError ? (
            /* Friendly, Empowering Fallback View when Permission is Blocked or Error */
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

              {/* Instant Native Camera Launcher (Works without WebRTC permissions) */}
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
                Butang 'Buka Kamera Telefon' menggunakan kamera asal peranti anda terus dan dijamin berfungsi di semua telefon.
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

              {/* 4 Corner Optical Alignment Overlay - Uncluttered & Mobile Precision */}
              <div className="absolute inset-4 sm:inset-8 border border-dashed border-purple-400/40 rounded-xl pointer-events-none flex flex-col justify-between p-2 select-none">
                {/* Top Row */}
                <div className="flex justify-between items-start">
                  {/* Top-Left Target Bracket */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-t-3 border-l-3 border-purple-400 rounded-tl flex items-center justify-center bg-purple-500/10 shadow-sm">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-black border border-purple-300"></div>
                  </div>

                  {/* Top Center Guide Banner */}
                  <div className="bg-black/80 backdrop-blur px-3 py-1 rounded-full border border-purple-500/40 text-center shadow">
                    <span className="text-[10px] sm:text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
                      Sejajarkan 4 Kotak Penjuru Kertas
                    </span>
                  </div>

                  {/* Top Right Target Bracket */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-t-3 border-r-3 border-purple-400 rounded-tr flex items-center justify-center bg-purple-500/10 shadow-sm">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-black border border-purple-300"></div>
                  </div>
                </div>

                {/* Center A4 Portrait Reference Reticle */}
                <div className="flex justify-between items-center w-full px-1">
                  <div className="w-3 h-6 bg-purple-400/60 rounded-r"></div>
                  <div className="text-center font-mono text-[9px] sm:text-[10px] text-slate-300/80 bg-black/60 px-2 py-0.5 rounded border border-indigo-500/30">
                    Kertas A4 Tegak
                  </div>
                  <div className="w-3 h-6 bg-purple-400/60 rounded-l"></div>
                </div>

                {/* Bottom Row */}
                <div className="flex justify-between items-end">
                  {/* Bottom-Left Target Bracket */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-b-3 border-l-3 border-purple-400 rounded-bl flex items-center justify-center bg-purple-500/10 shadow-sm">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-black border border-purple-300"></div>
                  </div>

                  {/* Lock Alignment Status */}
                  <button
                    type="button"
                    onClick={() => setIsCornerAligned(!isCornerAligned)}
                    className={`pointer-events-auto px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold transition flex items-center gap-1.5 border shadow-lg ${
                      isCornerAligned
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-300 shadow-purple-950/60'
                        : 'bg-black/80 text-purple-300 border-purple-500/60'
                    }`}
                  >
                    <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {isCornerAligned ? '✔ Penjuru Terkunci' : 'Kunci Penjuru'}
                  </button>

                  {/* Bottom-Right Target Bracket */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-b-3 border-r-3 border-purple-400 rounded-br flex items-center justify-center bg-purple-500/10 shadow-sm">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-black border border-purple-300"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Camera Controls - Mobile Native Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border-t border-indigo-500/20 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Switch Camera */}
          <div className="w-20 sm:w-28 flex items-center justify-start">
            {!cameraError && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
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
                className="py-3 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Pilih Foto Kertas</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isCapturing}
                onClick={handleSnap}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white p-1 flex items-center justify-center shadow-xl transition active:scale-90 focus:outline-none"
                aria-label="Tangkap Gambar"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-2 border-white flex items-center justify-center text-white">
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
                className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
                title="Guna Kamera Peranti"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-2.5 text-slate-400 hover:text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
