import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, Circle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError("Unable to access camera. Please check permissions.");
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="absolute bottom-full mb-6 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-xl mx-auto bg-[var(--bg-secondary)] dark:bg-[var(--bg-card)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border-color)] backdrop-blur-xl">
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-8">
              <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
              <p className="text-sm text-zinc-400 font-medium">{error}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-500",
                  isReady ? "opacity-100" : "opacity-0"
                )}
              />
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              )}
            </>
          )}

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <button 
            onClick={handleCapture}
            disabled={!isReady}
            className="w-16 h-16 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 p-1 transition-all active:scale-90 shadow-lg shadow-indigo-500/20 group"
          >
            <div className="w-full h-full rounded-full border-4 border-white/20 flex items-center justify-center">
              <Circle className="w-8 h-8 text-white fill-white opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          <span className="mt-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Capture Frame</span>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
