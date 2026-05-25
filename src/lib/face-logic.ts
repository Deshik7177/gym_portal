'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;
const MEMBER_CACHE = new Map<string, { data: any, buffer: Float32Array }>();

/**
 * Loads optimized models for the biometric pipeline.
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
 * Rejects frames that are blurred, off-center, or too small.
 */
export async function checkFrameQuality(
  detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>,
  lastDescriptor?: number[]
) {
  if (!detection) return { isValid: false, reason: "No face detected" };
  
  const { detection: d, landmarks, descriptor } = detection;
  
  // 1. Confidence Threshold
  if (d.score < 0.6) return { isValid: false, reason: "Face unclear" };

  // 2. Centering & Alignment
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
  const horizontalOffset = Math.abs(nose[0].x - eyeCenterX);
  
  if (horizontalOffset > 35) return { isValid: false, reason: "Center your face" };

  // 3. Size in Frame (Ensures enough detail)
  if (d.box.width < 120) return { isValid: false, reason: "Step closer" };

  // 4. Movement Validation (For enrollment diversity)
  if (lastDescriptor) {
    const dist = faceapi.euclideanDistance(new Float32Array(descriptor), new Float32Array(lastDescriptor));
    if (dist < 0.15) return { isValid: false, reason: "Slowly tilt your head" };
  }

  return { isValid: true };
}

/**
 * Validates that all captured samples are consistent.
 */
export function validateSampleConsistency(embeddings: number[][]): boolean {
  if (embeddings.length < 2) return true;
  const avg = averageEmbeddings(embeddings);
  const avgArr = new Float32Array(avg);

  for (const emb of embeddings) {
    const dist = faceapi.euclideanDistance(avgArr, new Float32Array(emb));
    if (dist > 0.42) return false; // Reject drift
  }
  return true;
}

/**
 * Calculates the average descriptor.
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
 * Performs optimized 1:N matching using pre-buffered Float32Arrays.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  if (!liveDescriptor || liveDescriptor.length !== 128 || !members || members.length === 0) {
    return { bestMatch: null, distance: 2.0 };
  }

  const liveArray = new Float32Array(liveDescriptor);
  let bestMatch = null;
  let minDistance = 2.0;

  // Sync Cache: Avoid repetitive array allocations inside the loop
  members.forEach(m => {
    if (!m.faceEmbedding) return;
    const cacheKey = m.id || m.phone;
    if (!MEMBER_CACHE.has(cacheKey)) {
      MEMBER_CACHE.set(cacheKey, {
        data: m,
        buffer: new Float32Array(m.faceEmbedding)
      });
    }
  });

  // Optimized vector comparison
  for (const entry of MEMBER_CACHE.values()) {
    const distance = faceapi.euclideanDistance(liveArray, entry.buffer);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = entry.data;
    }
  }

  return { bestMatch, distance: minDistance };
}

/**
 * Clears the matching cache (e.g., when members list is updated).
 */
export function clearBiometricCache() {
  MEMBER_CACHE.clear();
}
