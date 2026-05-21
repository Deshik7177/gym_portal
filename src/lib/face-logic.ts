
'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads face-api.js models for local on-device recognition.
 * Memoized to prevent multiple redundant loads.
 */
export function loadFaceModels() {
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  modelsLoadedPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log('Local AI Models Ready');
    } catch (error) {
      console.error('Failed to load local AI models:', error);
      modelsLoadedPromise = null; // Allow retry on failure
      throw error;
    }
  })();
  
  return modelsLoadedPromise;
}

/**
 * Calculates cosine similarity between two 128D embeddings.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Detects a face and generates a mathematical embedding.
 * Uses TinyFaceDetector for better performance on mobile.
 */
export async function generateEmbedding(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  await loadFaceModels();
  
  // Use a smaller detection scale to improve performance (less main thread blocking)
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 });
  
  const detection = await faceapi.detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  return detection ? Array.from(detection.descriptor) : null;
}

/**
 * Matches a live face against a list of stored embeddings.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let maxSimilarity = 0;

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
