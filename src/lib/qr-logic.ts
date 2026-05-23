'use client';

/**
 * QR Logic Service - High Performance Edition
 * 
 * Generates unique, permanent QR payloads for members.
 * Simplified for maximum scanning speed and zero latency.
 */

/**
 * Generates a unique, permanent QR payload for a member.
 * This payload is static and generated once per member.
 * @param memberId The unique ID (phone) of the member.
 * @returns A unique string to be rendered as a QR code.
 */
export function generateMemberQrPayload(memberId: string) {
  // Using a simple prefix to identify gym tokens while keeping payload small for fast scanning
  return `TFIT-${memberId}`;
}

/**
 * Validates a scanned QR payload string.
 * @param payload The raw string read by the QR scanner.
 * @returns An object containing validation status and data.
 */
export function validateQrPayload(payload: string) {
  try {
    if (!payload.startsWith('TFIT-')) {
      return { valid: false, reason: 'INVALID_FORMAT' };
    }
    
    const memberId = payload.replace('TFIT-', '');
    
    return {
      valid: true,
      memberId: memberId
    };
  } catch (e) {
    return { valid: false, reason: 'DECODE_ERROR' };
  }
}
