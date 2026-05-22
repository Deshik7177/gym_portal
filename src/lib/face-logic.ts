'use client';

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<void> | null = null;

/**
 * Loads face-api.js models for local on-device recognition.
 * Upgraded to SsdMobilenetv1 for professional-grade accuracy.
 */
export function loadFaceModels() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (modelsLoadedPromise) return modelsLoadedPromise;
  
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  modelsLoadedPromise = (async () => {
    try {
      // Using SsdMobilenetv1 instead of TinyFaceDetector for significantly higher accuracy
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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
 * Check for face presence using high-accuracy SSD Mobilenet.
 */
export async function isFaceInFrame(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (input instanceof HTMLVideoElement) {
    if (input.readyState < 2) return false;
    if (input.videoWidth === 0) return false;
  }
  
  await loadFaceModels();
  
  // SsdMobilenetv1 is much more robust for registration
  const options = new faceapi.SsdMobilenetv1Options({ 
    minConfidence: 0.3 // More permissive for detection to ensure we find the face
  });
  
  const detection = await faceapi.detectSingleFace(input, options);
  return !!detection;
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecA.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Generates 128D face descriptor using high-accuracy SSD Mobilenet.
 */
export async function generateEmbedding(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (input instanceof HTMLVideoElement && input.readyState < 2) return null;
  
  await loadFaceModels();
  
  const options = new faceapi.SsdMobilenetv1Options({ 
    minConfidence: 0.3 
  });
  
  try {
    const detection = await faceapi.detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
      
    return detection ? Array.from(detection.descriptor) : null;
  } catch (err) {
    return null;
  }
}

/**
 * 1:N local search.
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
