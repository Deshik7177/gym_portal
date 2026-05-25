'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Camera, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadFaceModels, checkFrameQuality, averageEmbeddings } from '@/lib/face-logic';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FaceEnrollmentProps {
  onComplete: (embedding: number[]) => void;
  onCancel: () => void;
}

export function FaceEnrollment({ onComplete, onCancel }: FaceEnrollmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([]);
  const [status, setStatus] = useState<string>("Initializing...");
  const requestRef = useRef<number>(null);

  const REQUIRED_SAMPLES = 5;

  const captureCycle = useCallback(async () => {
    if (!videoRef.current || capturedEmbeddings.length >= REQUIRED_SAMPLES) return;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          setCapturedEmbeddings(prev => {
            const next = [...prev, Array.from(detection.descriptor)];
            setStatus(`Capturing Biometrics: ${next.length}/${REQUIRED_SAMPLES}`);
            return next;
          });
        } else {
          setStatus(quality.reason || "Adjust Position");
        }
      } else {
        setStatus("No Face Detected");
      }
    } catch (err) {
      console.warn("Enrollment frame skipped:", err);
    }

    if (capturedEmbeddings.length < REQUIRED_SAMPLES) {
      requestRef.current = requestAnimationFrame(captureCycle);
    } else {
      const finalEmbedding = averageEmbeddings(capturedEmbeddings);
      onComplete(finalEmbedding);
    }
  }, [capturedEmbeddings, onComplete]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!isInitializing && !cameraError) {
      requestRef.current = requestAnimationFrame(captureCycle);
    }
  }, [isInitializing, cameraError, captureCycle]);

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
      setCameraError(err.message || "Camera access denied.");
      setIsInitializing(false);
    }
  }

  function stopCamera() {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  const progress = (capturedEmbeddings.length / REQUIRED_SAMPLES) * 100;

  if (cameraError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center bg-black">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-black uppercase italic">Hardware Blocked</h3>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px]">
          Please enable camera access in your browser settings to continue enrollment.
        </p>
        <Button onClick={onCancel} variant="outline" className="rounded-xl px-10">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "flex-1 w-full object-cover transition-opacity duration-700",
          isInitializing ? "opacity-0" : "opacity-100"
        )}
      />
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[240px] h-[320px] border-2 border-primary/30 rounded-[120px] relative">
           <div className="absolute inset-0 border border-primary/10 rounded-[118px] animate-pulse" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-full bg-primary/20 animate-scan" />
        </div>
      </div>

      <div className="absolute top-0 inset-x-0 p-8 flex justify-between items-center z-10">
         <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">{status}</span>
         </div>
         <Button size="icon" variant="ghost" onClick={onCancel} className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/5 pointer-events-auto">
            <X className="h-5 w-5" />
         </Button>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 space-y-4 bg-gradient-to-t from-black to-transparent">
         <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sample Acquisition</span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{Math.round(progress)}%</span>
         </div>
         <Progress value={progress} className="h-1 bg-white/10" />
      </div>

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl z-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-primary/60 italic">Engaging Biometric Sensors...</p>
        </div>
      )}
    </div>
  );
}
