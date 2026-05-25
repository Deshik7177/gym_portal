'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldAlert, CheckCircle2, X, RefreshCcw } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadFaceModels, checkFrameQuality, averageEmbeddings, validateSampleConsistency } from '@/lib/face-logic';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FaceEnrollmentProps {
  onComplete: (embedding: number[]) => void;
  onCancel: () => void;
}

export function FaceEnrollment({ onComplete, onCancel }: FaceEnrollmentProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [status, setStatus] = useState<string>("Initializing...");
  
  // Semaphore and data storage using Refs to avoid closure staleness and heavy re-renders
  const isProcessingRef = useRef(false);
  const capturedEmbeddingsRef = useRef<number[][]>([]);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const REQUIRED_SAMPLES = 5;

  const runInferenceCycle = async () => {
    if (!videoRef.current || isProcessingRef.current || capturedEmbeddingsRef.current.length >= REQUIRED_SAMPLES) {
      return;
    }

    // Video readiness check
    if (videoRef.current.readyState !== 4) {
      loopTimeoutRef.current = setTimeout(runInferenceCycle, 200);
      return;
    }

    isProcessingRef.current = true;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const lastEmb = capturedEmbeddingsRef.current[capturedEmbeddingsRef.current.length - 1];
        const quality = await checkFrameQuality(detection, lastEmb);
        
        if (quality.isValid) {
          capturedEmbeddingsRef.current.push(Array.from(detection.descriptor));
          setCapturedCount(capturedEmbeddingsRef.current.length);
          setStatus(`Samples: ${capturedEmbeddingsRef.current.length}/${REQUIRED_SAMPLES}`);
          
          if (capturedEmbeddingsRef.current.length >= REQUIRED_SAMPLES) {
            handleFinalize();
            return;
          }
        } else {
          setStatus(quality.reason || "Adjust Position");
        }
      } else {
        setStatus("No Face Detected");
      }
    } catch (err) {
      console.warn("Inference cycle error:", err);
    } finally {
      isProcessingRef.current = false;
      // Throttled loop: ~4 FPS for enrollment
      loopTimeoutRef.current = setTimeout(runInferenceCycle, 250);
    }
  };

  const handleFinalize = () => {
    const samples = capturedEmbeddingsRef.current;
    if (!validateSampleConsistency(samples)) {
      toast({ 
        variant: "destructive", 
        title: "Enrollment Inconsistent", 
        description: "Significant drift detected. Please keep your face steady but tilt slightly." 
      });
      resetEnrollment();
      return;
    }

    const finalEmbedding = averageEmbeddings(samples);
    onComplete(finalEmbedding);
  };

  const resetEnrollment = () => {
    capturedEmbeddingsRef.current = [];
    setCapturedCount(0);
    setStatus("Restarting...");
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    loopTimeoutRef.current = setTimeout(runInferenceCycle, 1000);
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      stopCamera();
    };
  }, []);

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
        // Start throttled loop
        runInferenceCycle();
      }
    } catch (err: any) {
      setCameraError(err.message || "Camera access denied.");
      setIsInitializing(false);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  const progress = (capturedCount / REQUIRED_SAMPLES) * 100;

  if (cameraError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center bg-black">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-black uppercase italic">Hardware Blocked</h3>
        <p className="text-muted-foreground text-xs max-w-[200px] leading-relaxed">
          Please enable camera access to continue enrollment.
        </p>
        <Button onClick={onCancel} variant="outline" className="rounded-xl px-10 border-white/10">Go Back</Button>
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
          "flex-1 w-full h-full object-cover transition-opacity duration-700",
          isInitializing ? "opacity-0" : "opacity-100"
        )}
      />
      
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
            <X className="h-5 w-5 text-white/50" />
         </Button>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 space-y-4 bg-gradient-to-t from-black to-transparent">
         <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Biometric Acquisition</span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{Math.round(progress)}%</span>
         </div>
         <Progress value={progress} className="h-1 bg-white/10" />
      </div>

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl z-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-primary/60 italic">Calibrating Optics...</p>
        </div>
      )}
    </div>
  );
}
