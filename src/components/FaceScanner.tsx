'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadFaceModels, checkFrameQuality, findBestMatch } from '@/lib/face-logic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FaceScannerProps {
  members: any[];
  onMatch: (member: any) => void;
  isActive: boolean;
}

export function FaceScanner({ members, onMatch, isActive }: FaceScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const isProcessingRef = useRef(false);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const runVerificationCycle = async () => {
    if (!videoRef.current || !isActive || isProcessingRef.current) return;

    if (videoRef.current.readyState !== 4) {
      loopTimeoutRef.current = setTimeout(runVerificationCycle, 200);
      return;
    }

    isProcessingRef.current = true;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          const { bestMatch, distance } = findBestMatch(Array.from(detection.descriptor), members);
          
          if (bestMatch && distance < 0.48) {
            onMatch(bestMatch);
            // Cycle will be paused by parent state (isActive = false) on match
            return; 
          }
        }
      }
    } catch (err) {
      console.warn("Verification cycle error:", err);
    } finally {
      isProcessingRef.current = false;
      // Throttled loop: ~3 FPS for verification to keep UI fluid
      loopTimeoutRef.current = setTimeout(runVerificationCycle, 330);
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      stopCamera();
    }
    return () => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      stopCamera();
    };
  }, [isActive]);

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
        runVerificationCycle();
      }
    } catch (err: any) {
      setCameraError(err.message || "Camera hardware failure.");
      setIsInitializing(false);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center h-full bg-zinc-950">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-bold uppercase tracking-tighter">Sensor Failure</h3>
        <p className="text-muted-foreground text-sm max-w-xs">{cameraError}</p>
        <Button onClick={startCamera} variant="outline" className="mt-4 border-white/10">Retry Hardware Link</Button>
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
          <p className="text-xs font-black uppercase tracking-widest text-primary/60">Calibrating Biometric Engine...</p>
        </div>
      )}

      <div className="absolute bottom-6 left-6 z-20">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Biometric Engine: Active</span>
        </div>
      </div>
    </div>
  );
}
