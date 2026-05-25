'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads optimized models for the biometric pipeline.
 * Switched to TinyFaceDetector for better performance on kiosk hardware.
 */
export function loadFaceModels() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  modelsLoadedPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log('Production Biometric Pipeline Initialized (TinyFace)');
    } catch (error) {
      console.error('Failed to load local AI models:', error);
      modelsLoadedPromise = null; 
      throw error;
    }
  })();
  
  return modelsLoadedPromise;
}

/**
 * Hardened quality check.
 * Validates centering, size, and requires micro-movements between samples.
 */
export async function checkFrameQuality(
  detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>,
  lastDescriptor?: number[]
) {
  if (!detection) return { isValid: false, reason: "No face detected" };
  
  const { detection: d, landmarks, descriptor } = detection;
  
  // 1. Confidence Threshold (Tiny detector needs ~0.5)
  if (d.score < 0.5) return { isValid: false, reason: "Face unclear" };

  // 2. Centering & Pose Estimation
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
  const horizontalOffset = Math.abs(nose[0].x - eyeCenterX);
  
  if (horizontalOffset > 40) return { isValid: false, reason: "Center your face" };

  // 3. Proximity Check (Size in frame)
  if (d.box.width < 110) return { isValid: false, reason: "Step closer" };

  // 4. Movement Validation (Anti-Stasis)
  // Rejects identical frames to ensure 5 unique samples
  if (lastDescriptor) {
    const dist = faceapi.euclideanDistance(new Float32Array(descriptor), new Float32Array(lastDescriptor));
    if (dist < 0.12) return { isValid: false, reason: "Tilt your head slightly" };
  }

  return { isValid: true };
}

/**
 * Validates that all captured samples are consistent.
 * Detects if a "poison" sample was introduced during enrollment.
 */
export function validateSampleConsistency(embeddings: number[][]): boolean {
  if (embeddings.length < 2) return true;
  const avg = averageEmbeddings(embeddings);
  const avgArr = new Float32Array(avg);

  // Check if any sample drifts too far from the average (> 0.45)
  for (const emb of embeddings) {
    const dist = faceapi.euclideanDistance(avgArr, new Float32Array(emb));
    if (dist > 0.45) return false;
  }
  return true;
}

/**
 * Calculates the average descriptor from multiple frames.
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const length = embeddings[0].length;
  const average = new Array(length).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < length; i++) {
      average[i] += emb[i];
    }
  }

  return average.map(val => val / embeddings.length);
}

/**
 * Performs 1:N local similarity comparison.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let minDistance = 2.0;

  if (!liveDescriptor || liveDescriptor.length !== 128 || !members || members.length === 0) {
    return { bestMatch: null, distance: 2.0 };
  }

  const liveArray = new Float32Array(liveDescriptor);

  for (const member of members) {
    if (!member.faceEmbedding || !Array.isArray(member.faceEmbedding) || member.faceEmbedding.length !== 128) continue;
    
    const storedArray = new Float32Array(member.faceEmbedding);
    const distance = faceapi.euclideanDistance(liveArray, storedArray);
    
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = member;
    }
  }

  return { bestMatch, distance: minDistance };
}
