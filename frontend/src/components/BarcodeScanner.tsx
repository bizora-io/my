import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Keyboard, ScanLine, AlertCircle, Flashlight, FlashlightOff } from 'lucide-react';

export type BarcodeScanResult = {
  code: string;
  format?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (result: BarcodeScanResult) => void;
  title?: string;
  /** Prefer continuous camera scanning when supported */
  preferCamera?: boolean;
};

/**
 * Hardware (USB/Bluetooth) scanners act as a keyboard: they type the code
 * and press Enter. Camera scanning uses the native BarcodeDetector API when
 * available (Chrome/Edge on HTTPS or localhost). No extra npm dependency.
 */
const BarcodeScanner: React.FC<Props> = ({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode',
  preferCamera = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastAtRef = useRef<number>(0);

  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  const emit = useCallback(
    (code: string, format?: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      // Debounce identical codes (camera can fire many frames)
      const now = Date.now();
      if (trimmed === lastCodeRef.current && now - lastAtRef.current < 1500) return;
      lastCodeRef.current = trimmed;
      lastAtRef.current = now;
      onScan({ code: trimmed, format });
    },
    [onScan]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setSupported(hasDetector);

    if (!hasDetector) {
      setError('Camera barcode detection is not supported in this browser. Use a USB scanner or type the code below.');
      setTimeout(() => manualInputRef.current?.focus(), 100);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // @ts-expect-error BarcodeDetector is not in all TS lib versions
      const detector = new window.BarcodeDetector({
        formats: [
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'qr_code',
          'codabar',
          'itf',
        ],
      });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const first = codes[0];
            const value = first.rawValue != null ? String(first.rawValue) : '';
            if (value) emit(value, first.format);
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.warn('Camera start failed', err);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access or use a USB scanner / manual entry.'
          : 'Could not open camera. Use a USB scanner or enter the code manually.'
      );
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [emit]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManual('');
      setError(null);
      return;
    }
    if (preferCamera) {
      startCamera();
    } else {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
    return () => stopCamera();
  }, [open, preferCamera, startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    const caps = track.getCapabilities?.() as any;
    if (!caps?.torch) {
      setError('Torch is not available on this device.');
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
      setTorchOn(!torchOn);
    } catch {
      setError('Could not toggle torch.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
            playsInline
            muted
          />
          {cameraActive && (
            <>
              <div className="absolute inset-0 pointer-events-none border-2 border-indigo-400/40 m-10 rounded-xl" />
              <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-red-500/80 animate-pulse" />
            </>
          )}
          {!cameraActive && (
            <div className="text-center text-white/80 p-6 space-y-2">
              <Camera className="w-10 h-10 mx-auto opacity-60" />
              <p className="text-sm">
                {error ? 'Camera unavailable' : 'Starting camera…'}
              </p>
            </div>
          )}
          {cameraActive && (
            <button
              type="button"
              onClick={toggleTorch}
              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              title="Toggle torch"
            >
              {torchOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
            </button>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 flex gap-2 items-start text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700">USB / Bluetooth scanner:</strong> click the field below (or the POS search box) and scan —
            hardware scanners type the code and press Enter automatically.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={manualInputRef}
                value={manual}
                onChange={e => setManual(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && manual.trim()) {
                    e.preventDefault();
                    emit(manual.trim());
                    setManual('');
                  }
                }}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Scan or type barcode, then Enter"
                autoComplete="off"
                autoFocus={!preferCamera}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (manual.trim()) {
                  emit(manual.trim());
                  setManual('');
                }
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
            >
              Use
            </button>
          </div>
          {!cameraActive && supported !== false && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Retry camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
