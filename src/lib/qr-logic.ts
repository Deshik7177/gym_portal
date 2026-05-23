
'use client';

/**
 * QR Logic Service
 * 
 * This service handles the generation and validation of secure entry tokens.
 * In this prototype, we use Base64 encoding to package member data.
 * 
 * Workflow:
 * 1. Generate: Member ID + Timestamp -> JSON -> Base64 Token
 * 2. Scan: Base64 Token -> JSON -> Extract Member ID
 * 3. Verify: Check Member ID against Firestore records.
 */

/**
 * Generates a secure-ish, time-stamped QR payload for a member.
 * @param memberId The unique ID (usually phone) of the member.
 * @returns A Base64 encoded string to be rendered as a QR code.
 */
export function generateMemberQrPayload(memberId: string) {
  const payload = {
    mid: memberId,       // Member ID
    iat: Date.now(),     // Issued At (Timestamp)
    v: '1.0'             // Protocol Version
  };
  
  // For production: You would typically sign this payload with a 
  // Private Key (JWT-style) to prevent members from spoofing IDs.
  return btoa(JSON.stringify(payload));
}

/**
 * Validates a scanned QR payload string.
 * @param payload The raw string read by the QR scanner.
 * @returns The decoded member data or null if invalid.
 */
export function validateQrPayload(payload: string) {
  try {
    // Decode the Base64 string back into a JSON object
    const decoded = JSON.parse(atob(payload));
    
    // Basic structural validation
    if (!decoded.mid || !decoded.iat) return null;
    
    // Security Note: You can add an expiration check here.
    // e.g., if (Date.now() - decoded.iat > 86400000) return null; // 24h limit
    
    return {
      memberId: decoded.mid,
      issuedAt: decoded.iat
    };
  } catch (e) {
    // Returns null if the string is not valid Base64 or JSON
    return null;
  }
}
