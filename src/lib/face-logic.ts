'use client';

import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Loads face-api.js models for local on-device recognition.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return;
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Local AI Models Ready');
  } catch (error) {
    console.error('Failed to load local AI models:', error);
  }
}

/**
 * Calculates cosine similarity between two 128D embeddings.
 * Production standard for facial vector comparison.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Detects a face and generates a mathematical embedding (descriptor).
 */
export async function generateEmbedding(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (!modelsLoaded) await loadFaceModels();
  const detection = await faceapi.detectSingleFace(
    input, 
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
}

/**
 * Matches a live face against a list of stored embeddings using cosine similarity.
 * Required threshold: 0.85
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let maxSimilarity = 0;

  for (const member of members) {
    if (!member.faceEmbedding) continue;
    const similarity = cosineSimilarity(liveDescriptor, member.faceEmbedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestMatch = member;
    }
  }

  return { bestMatch, confidence: maxSimilarity };
}
