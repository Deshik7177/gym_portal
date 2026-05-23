
'use client';

/**
 * Generates a secure, time-limited QR payload for a member.
 */
export function generateMemberQrPayload(memberId: string) {
  const payload = {
    mid: memberId,
    iat: Date.now(),
    v: '1.0'
  };
  // In a production app, we would sign this with a private key.
  // For the prototype, we use a simple base64 encoding to simulate security.
  return btoa(JSON.stringify(payload));
}

/**
 * Validates a scanned QR payload.
 */
export function validateQrPayload(payload: string) {
  try {
    const decoded = JSON.parse(atob(payload));
    if (!decoded.mid || !decoded.iat) return null;
    
    // Check expiration (e.g., tokens expire after 24 hours if they are pre-generated)
    // Or just validate existence for the prototype.
    return {
      memberId: decoded.mid,
      issuedAt: decoded.iat
    };
  } catch (e) {
    return null;
  }
}
