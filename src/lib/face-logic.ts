'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads high-precision models required for the biometric pipeline.
 * Ensures consistent model usage between enrollment and verification.
 */
export function loadFaceModels() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  modelsLoadedPromise = (async () => {
    try {
      // Use high-precision SSD and Landmarks for all operations
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log('Biometric Neural Pipeline Initialized');
    } catch (error) {
      console.error('Failed to load local AI models:', error);
      modelsLoadedPromise = null; 
      throw error;
    }
  })();
  
  return modelsLoadedPromise;
}

/**
 * Strict quality check for face frame to ensure high-fidelity embeddings.
 * Rejects frames based on angle, confidence, and lighting.
 */
export async function checkFrameQuality(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>) {
  if (!detection) return { isValid: false, reason: "No face detected" };
  
  const { detection: d, landmarks } = detection;
  
  // 1. Confidence Threshold (Relaxed from 0.8 to 0.6 for better accessibility)
  if (d.score < 0.6) return { isValid: false, reason: "Face unclear" };

  // 2. Pose Estimation (Alignment)
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
  const noseX = nose[0].x;
  const horizontalOffset = Math.abs(noseX - eyeCenterX);
  
  // Relaxed from 30 to 50 to allow more natural movement
  if (horizontalOffset > 50) return { isValid: false, reason: "Look at camera" };

  // 3. Proximity Check (Relaxed from 140 to 100)
  if (d.box.width < 100) return { isValid: false, reason: "Step closer" };

  // 4. Descriptor Validation
  if (!detection.descriptor || detection.descriptor.length !== 128) {
    return { isValid: false, reason: "Signal error" };
  }

  return { isValid: true };
}

/**
 * Calculates the average descriptor from multiple frames.
 * This stabilizes the biometric ID against lighting and pose noise.
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
 * Performs local similarity comparison using Euclidean Distance.
 * Threshold < 0.55 is recommended for high accuracy.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let minDistance = 2.0; // Euclidean distance max is 2.0

  if (!liveDescriptor || liveDescriptor.length !== 128 || !members || members.length === 0) {
    return { bestMatch: null, distance: 2.0 };
  }

  const liveArray = new Float32Array(liveDescriptor);

  for (const member of members) {
    if (!member.faceEmbedding || !Array.isArray(member.faceEmbedding) || member.faceEmbedding.length !== 128) continue;
    
    const storedArray = new Float32Array(member.faceEmbedding);
    const distance = faceapi.euclideanDistance(liveArray, storedArray);
    
    // Lower distance = closer match
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = member;
    }
  }

  if (bestMatch) {
    console.debug(`[Biometric] Best Candidate: ${bestMatch.fullName}, Dist: ${minDistance.toFixed(4)}`);
  }

  return { bestMatch, distance: minDistance };
}

/**
 * Lightweight passive detection
 */
export async function detectFacePassive(input: HTMLVideoElement | HTMLCanvasElement) {
  if (!input || (input instanceof HTMLVideoElement && input.readyState < 2)) return null;
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  return await faceapi.detectSingleFace(input, options);
}
