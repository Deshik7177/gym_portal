'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads face-api.js models for local on-device recognition.
 * These models are optimized for mobile browser performance.
 */
export function loadFaceModels() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  // Reliable model URLs
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
 * Lightweight check for face presence before starting heavy recognition.
 */
export async function isFaceInFrame(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (input instanceof HTMLVideoElement) {
    if (input.readyState < 2) return false;
    if (input.videoWidth === 0) return false;
  }
  
  await loadFaceModels();
  
  const options = new faceapi.TinyFaceDetectorOptions({ 
    inputSize: 128, 
    scoreThreshold: 0.5 
  });
  
  const detection = await faceapi.detectSingleFace(input, options);
  return !!detection;
}

/**
 * Calculates cosine similarity between two 128D embeddings.
 * Production standard for vector comparison.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Detects face and generates the 128-dimensional mathematical descriptor.
 */
export async function generateEmbedding(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (input instanceof HTMLVideoElement && input.readyState < 2) return null;
  
  await loadFaceModels();
  
  const options = new faceapi.TinyFaceDetectorOptions({ 
    inputSize: 160, 
    scoreThreshold: 0.6 
  });
  
  try {
    const detection = await faceapi.detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
      
    return detection ? Array.from(detection.descriptor) : null;
  } catch (err) {
    console.error('Embedding generation error:', err);
    return null;
  }
}

/**
 * Performs a 1:N local search against cached members.
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
