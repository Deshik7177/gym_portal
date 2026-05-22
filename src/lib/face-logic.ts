
'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads high-precision and lightweight models for biometric pipeline.
 */
export function loadFaceModels() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  modelsLoadedPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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
 * Quality check for face frame to ensure high-fidelity embeddings.
 */
export async function checkFrameQuality(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>) {
  if (!detection) return { isValid: false, reason: "No face detected" };
  
  const { detection: d, landmarks } = detection;
  
  // 1. Confidence threshold for the detection itself
  if (d.score < 0.7) return { isValid: false, reason: "Low quality frame" };

  // 2. Pose Estimation: Ensure face is relatively centered and facing forward
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Basic check: is the nose roughly centered between eyes horizontally?
  const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
  const noseX = nose[0].x;
  const horizontalOffset = Math.abs(noseX - eyeCenterX);
  
  if (horizontalOffset > 40) return { isValid: false, reason: "Please face forward" };

  // 3. Face size: Ensure they aren't too far away
  if (d.box.width < 120) return { isValid: false, reason: "Move closer" };

  return { isValid: true };
}

/**
 * Cosine similarity between two vectors.
 * Higher score = higher similarity.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  if (vecA.length !== vecB.length) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Performs local similarity comparison against cached members.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let maxSimilarity = 0;

  if (!liveDescriptor || liveDescriptor.length === 0 || !members || members.length === 0) {
    return { bestMatch: null, confidence: 0 };
  }

  for (const member of members) {
    if (!member.faceEmbedding || !Array.isArray(member.faceEmbedding)) continue;
    
    const similarity = cosineSimilarity(liveDescriptor, member.faceEmbedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestMatch = member;
    }
  }

  return { bestMatch, confidence: maxSimilarity };
}

/**
 * Lightweight passive detection using TinyFaceDetector for background monitoring.
 */
export async function detectFacePassive(input: HTMLVideoElement | HTMLCanvasElement) {
  if (!input || (input instanceof HTMLVideoElement && input.readyState < 2)) return null;
  
  await loadFaceModels();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  return await faceapi.detectSingleFace(input, options);
}
