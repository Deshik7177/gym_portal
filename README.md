# Thrive Fit | Staff Portal

This is the central operating system for Thrive Fit gym operations.

## Features
- **Smart Entrance:** Face ID and QR-based biometric entry.
- **Member Management:** Registry with biometric enrollment.
- **Financial Ledger:** Automatic sales logging for registrations and PT sessions.
- **Hardware Sync:** Real-time gate control for ESP32 relays.

## Hardware Integration
To integrate your physical gate/turnstile:
1. See `docs/esp32-integration.md` for the ESP32 setup guide.
2. The system dispatches commands to the `gateControl` Firestore collection.
3. Ensure your ESP32 is running the generated firmware to listen for these commands.

## Development
To start the local development server:
```bash
npm run dev
```
