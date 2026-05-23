'use client';

/**
 * QR Logic Service - Dynamic Security Edition
 * 
 * This service handles the generation and validation of secure entry tokens.
 * It uses a timestamp-based rolling window to ensure tokens are fresh.
 */

const TOKEN_EXPIRY_MS = 86400000; // 24 Hours TTL (Daily Passport)

/**
 * Generates a secure, time-stamped QR payload for a member.
 * @param memberId The unique ID (usually phone) of the member.
 * @returns A Base64 encoded string to be rendered as a QR code.
 */
export function generateMemberQrPayload(memberId: string) {
  const payload = {
    mid: memberId,
    iat: Date.now(), // Issued At
    v: '1.2'         // Security Version 1.2
  };
  
  // Encoding the JSON payload to Base64
  return btoa(JSON.stringify(payload));
}

/**
 * Validates a scanned QR payload string.
 * @param payload The raw string read by the QR scanner.
 * @returns An object containing validation status and data.
 */
export function validateQrPayload(payload: string) {
  try {
    const decoded = JSON.parse(atob(payload));
    
    if (!decoded.mid || !decoded.iat) return { valid: false, reason: 'MALFORMED' };
    
    // Check if the token has expired
    const age = Date.now() - decoded.iat;
    if (age > TOKEN_EXPIRY_MS) {
      return { valid: false, reason: 'EXPIRED', memberId: decoded.mid };
    }
    
    return {
      valid: true,
      memberId: decoded.mid,
      issuedAt: decoded.iat
    };
  } catch (e) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }
}
