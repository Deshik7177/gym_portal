'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Camera, ShieldAlert, Zap } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadFaceModels, checkFrameQuality, findBestMatch } from '@/lib/face-logic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FaceScannerProps {
  members: any[];
  onMatch: (member: any) => void;
  isActive: boolean;
}

export function FaceScanner({ members, onMatch, isActive }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const requestRef = useRef<number>(null);

  const detectAndMatch = useCallback(async () => {
    if (!videoRef.current || !isActive || isProcessing) return;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          const { bestMatch, distance } = findBestMatch(Array.from(detection.descriptor), members);
          
          // Distance threshold for a match (lower is better, < 0.45 is strict/good)
          if (bestMatch && distance < 0.48) {
            setIsProcessing(true);
            onMatch(bestMatch);
            // Resume detection after a delay happens in parent component state change
          }
        }
      }
    } catch (err) {
      console.warn("Detection cycle skipped:", err);
    }

    if (isActive) {
      requestRef.current = requestAnimationFrame(detectAndMatch);
    }
  }, [isActive, isProcessing, members, onMatch]);

  useEffect(() => {
    if (isActive) {
      setIsProcessing(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive]);

  useEffect(() => {
    if (isActive && !isInitializing && !cameraError) {
      requestRef.current = requestAnimationFrame(detectAndMatch);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isInitializing, cameraError, detectAndMatch]);

  async function startCamera() {
    setIsInitializing(true);
    setCameraError(null);
    try {
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsInitializing(false);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(err.message || "Could not access camera hardware.");
      setIsInitializing(false);
    }
  }

  function stopCamera() {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center h-full bg-zinc-950">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-bold uppercase tracking-tighter">Optical Engine Failure</h3>
        <p className="text-muted-foreground text-sm max-w-xs">{cameraError}</p>
        <Button onClick={startCamera} variant="outline" className="mt-4">Retry Hardware Link</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover transition-opacity duration-700",
          isInitializing ? "opacity-0" : "opacity-100"
        )}
      />
      
      {/* Face Guide Overlay */}
      {!isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[280px] h-[360px] border-2 border-primary/30 rounded-[140px] relative">
            <div className="absolute inset-0 border border-primary/10 rounded-[138px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-full bg-primary/20 animate-scan" />
          </div>
        </div>
      )}

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl z-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-primary/60">Calibrating Neural Net...</p>
        </div>
      )}

      {/* Real-time Status */}
      <div className="absolute bottom-6 left-6 z-20">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Biometric Engine: Active</span>
        </div>
      </div>
    </div>
  );
}
