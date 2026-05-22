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
 * Quality check for face frame.
 */
export async function checkFrameQuality(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>) {
  if (!detection) return { isValid: false, reason: "No face detected" };
  
  const { detection: d, landmarks } = detection;
  
  // 1. Confidence threshold
  if (d.score < 0.7) return { isValid: false, reason: "Low confidence scan" };

  // 2. Simple Pose Estimation (Face angle) via landmarks
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Basic check: is the nose roughly centered between eyes horizontally?
  const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
  const noseX = nose[0].x;
  const horizontalOffset = Math.abs(noseX - eyeCenterX);
  
  if (horizontalOffset > 40) return { isValid: false, reason: "Face angle too extreme" };

  return { isValid: true };
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Capture high-quality embeddings for enrollment by averaging multiple samples.
 */
export async function captureStableEnrollment(video: HTMLVideoElement, onProgress?: (p: number) => void) {
  await loadFaceModels();
  const samples: number[][] = [];
  const maxSamples = 10;
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  return new Promise<number[] | null>(async (resolve) => {
    const poll = async () => {
      if (samples.length >= maxSamples) {
        // Average all successful embeddings
        const averaged = samples[0].map((_, i) => 
          samples.reduce((acc, sample) => acc + sample[i], 0) / samples.length
        );
        resolve(averaged);
        return;
      }

      const detection = await faceapi.detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          samples.push(Array.from(detection.descriptor));
          onProgress?.(samples.length / maxSamples);
        }
      }

      requestAnimationFrame(poll);
    };
    poll();
  });
}

/**
 * Performs local similarity comparison against cached members.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let maxSimilarity = 0;

  if (!liveDescriptor || liveDescriptor.length === 0) return { bestMatch: null, confidence: 0 };

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
 * Lightweight passive detection using TinyFaceDetector.
 */
export async function detectFacePassive(input: HTMLVideoElement | HTMLCanvasElement) {
  await loadFaceModels();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
  return await faceapi.detectSingleFace(input, options);
}
