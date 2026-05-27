# ESP32 Gate Integration Guide

This document provides the necessary details to connect your ESP32 hardware to the Thrive Fit gate control system.

## Hardware Specifications
- **Microcontroller:** ESP32
- **Relay Pin:** GPIO 26 (Recommended)
- **Library:** [Firebase-ESP-Client](https://github.com/mobizt/Firebase-ESP-Client)

## Performance & Latency
Expected latency from portal trigger to physical relay is **300ms - 800ms**.
To maintain low latency:
1. **Use Real-time Listeners:** Ensure your ESP32 uses the `listen` or `stream` function of the Firebase library rather than polling.
2. **Signal Strength:** Keep the ESP32 within -65dBm or better WiFi signal range.
3. **Consumer Pattern:** The ESP32 must delete the document immediately after processing to keep the snapshot payload small.

## Firestore Schema
The ESP32 should listen to the `gateControl` collection. Documents are created with:
- `command`: "OPEN"
- `memberId`: The phone number of the member or "DASHBOARD_OVERRIDE"
- `method`: "face", "qr", or "manual"
- `timestamp`: Firestore Server Timestamp

## Logic: Process and Cleanup
To prevent the Firestore collection from getting cluttered, the ESP32 follows a **Consumer Pattern**:
1. Listen for a new document in `gateControl`.
2. Trigger the physical relay (GPIO 26 HIGH).
3. **Delete the document** from Firestore using its ID immediately after the gate pulse.

## Prompt for Code Generation
Copy and paste this into an AI to generate your firmware:

```text
Write Arduino C++ code for an ESP32 board using the 'Firebase-ESP-Client' library by mobizt. 

Goal: Connect to Firestore, trigger a relay, and delete the command document after execution.

Firebase Config:
- Project ID: studio-1536246552-55579
- API Key: AIzaSyC7MOBvS0RvcMn2810Z5I3N8n4RK3IVki4
- Collection Path: gateControl

Hardware Requirements:
- Use GPIO 26 to trigger a Relay (active HIGH).
- Include WiFi connection logic.

Logic:
1. Initialize Firestore connection and listen for new documents in 'gateControl'.
2. When a document is added where the 'command' field is "OPEN":
   - Set GPIO 26 to HIGH for 3 seconds, then set it to LOW.
   - Delete this specific document from Firestore immediately after the 3-second pulse to clear the queue.
3. Handle WiFi reconnections automatically.
```

## Security Note
Use Firebase **Anonymous Authentication** on the ESP32. Ensure your Firestore Security Rules allow the ESP32 to read and delete from the `gateControl` collection.
