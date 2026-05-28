
# ESP32 Gate Integration Guide | Production Spec

This document provides the necessary details to connect your ESP32 hardware to the Thrive Fit gate control system.

## Hardware Specifications
- **Microcontroller:** ESP32
- **Relay Pin:** GPIO 26 (Recommended)
- **Circuitry:** Use a 4.7kΩ pull-down resistor on GPIO 26 to prevent relay "flicker" on boot.
- **Library:** [Firebase-ESP-Client](https://github.com/mobizt/Firebase-ESP-Client)

## Network Architecture: Cloud-Based Sync
**Crucial Note:** The Staff Portal and the ESP32 **DO NOT** need to be on the same local network (SSID).
- The Portal writes a command to the Google Cloud (Firestore).
- The ESP32 listens to that same cloud location via a real-time stream.
- Latency: 300ms - 800ms.

## Production Logic: Safety & Expiry
To prevent "ghost entries" (commands executing minutes later after a WiFi reconnect), the ESP32 follows these rules:
1. **Expiry Check:** Only execute if `now < expiresAt`. 
2. **State Transition:** Immediately update `status` to `processing` to "claim" the command.
3. **Consumer Pattern:** Delete the document after pulsing the relay.

## Prompt for Code Generation
Copy and paste this into an AI to generate your firmware:

```text
Write Arduino C++ code for an ESP32 board using the 'Firebase-ESP-Client' library by mobizt. 

Goal: Connect to Firestore, trigger a relay safely, and clean up the command queue.

Hardware Requirements:
- Use GPIO 26 for the Relay.
- IMPORTANT: Initialize GPIO 26 as OUTPUT and set to LOW immediately in setup() to prevent boot flicker.

Firebase Config:
- Project ID: studio-1536246552-55579
- API Key: AIzaSyC7MOBvS0RvcMn2810Z5I3N8n4RK3IVki4

Logic:
1. Initialize Firestore and listen for new documents in the 'gateControl' collection.
2. When a document is received with field 'command' == "OPEN" and 'status' == "pending":
   - GET current Unix time (ms).
   - If (currentTime < doc.expiresAt):
     - UPDATE document 'status' to "processing".
     - SET GPIO 26 to HIGH for 3 seconds.
     - SET GPIO 26 to LOW.
     - DELETE the document from Firestore.
   - Else (if expired):
     - DELETE the document without triggering the relay.
3. Handle WiFi reconnections automatically using a non-blocking watchdog pattern.
```

## Security Note
Use Firebase **Anonymous Authentication** on the ESP32 for production. Ensure your Firestore Security Rules allow the ESP32 to read/update/delete from the `gateControl` collection.
