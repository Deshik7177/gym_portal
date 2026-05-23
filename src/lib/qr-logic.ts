
'use client';

/**
 * QR Logic Service - Permanent ID Edition
 * 
 * Generates unique, static QR payloads for members.
 * These IDs are permanent and optimized for zero-latency scanning.
 */

/**
 * Generates a unique, permanent QR payload for a member.
 * This ID is static and acts as the member's digital passport.
 * @param memberId The unique phone ID of the member.
 * @returns A unique string to be rendered as a QR code.
 */
export function generateMemberQrPayload(memberId: string) {
  // We use a fixed prefix to distinguish our gym's IDs from other QR codes
  return `TFIT-${memberId}`;
}

/**
 * Validates a scanned QR payload string.
 * @param payload The raw string read by the QR scanner.
 * @returns An object containing validation status and data.
 */
export function validateQrPayload(payload: string) {
  try {
    if (!payload || !payload.startsWith('TFIT-')) {
      return { valid: false, reason: 'INVALID_FORMAT' };
    }
    
    // Extract the member's unique ID (phone number) from the payload
    const memberId = payload.replace('TFIT-', '');
    
    return {
      valid: true,
      memberId: memberId
    };
  } catch (e) {
    return { valid: false, reason: 'DECODE_ERROR' };
  }
}
