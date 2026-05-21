
'use client';

import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Loads the face-api.js models from a public CDN.
 * Models: TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet
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
    console.log('Face models loaded successfully');
  } catch (error) {
    console.error('Failed to load face models:', error);
    throw new Error('Face recognition models failed to load.');
  }
}

/**
 * Generates a face embedding (descriptor) from a video or image element.
 */
export async function generateEmbedding(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  if (!modelsLoaded) await loadFaceModels();

  const detection = await faceapi.detectSingleFace(
    input, 
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceDescriptor();

  if (!detection) return null;
  
  // Convert Float32Array to standard number array for Firestore storage
  return Array.from(detection.descriptor);
}

/**
 * Compares a live descriptor against a known descriptor using Euclidean distance.
 * Lower distance = higher similarity. Threshold is typically 0.6 for recognition.
 */
export function compareEmbeddings(descriptor1: number[], descriptor2: number[]) {
  const d1 = new Float32Array(descriptor1);
  const d2 = new Float32Array(descriptor2);
  const distance = faceapi.euclideanDistance(d1, d2);
  
  // Convert distance to a confidence score (0 to 1)
  // Threshold 0.6 is roughly 0.85 confidence in this mapping
  const confidence = Math.max(0, 1 - (distance / 0.6));
  return { distance, confidence };
}

/**
 * Finds the best match from a gallery of members.
 */
export function findBestMatch(liveDescriptor: number[], members: any[]) {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const member of members) {
    if (!member.faceEmbedding) continue;
    
    const { confidence } = compareEmbeddings(liveDescriptor, member.faceEmbedding);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = member;
    }
  }

  return { bestMatch, confidence: bestConfidence };
}
