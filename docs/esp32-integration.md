# ESP32 Gate Integration Guide

This document provides the necessary details to connect your ESP32 hardware to the Thrive Fit gate control system.

## Hardware Specifications
- **Microcontroller:** ESP32
- **Relay Pin:** GPIO 26 (Recommended)
- **Library:** [Firebase-ESP-Client](https://github.com/mobizt/Firebase-ESP-Client)

## Firestore Schema
The ESP32 should listen to the `gateControl` collection. When a match is found in the Entrance Kiosk or Counter Portal, a document is created with:
- `command`: "OPEN"
- `memberId`: The phone number of the member
- `method`: "face", "qr", or "manual"
- `timestamp`: Firestore Server Timestamp

## Logic: Process and Cleanup
To prevent the Firestore collection from getting "full" or cluttered, the ESP32 should follow a **Consumer Pattern**:
1. Listen for a new document.
2. Trigger the physical relay.
3. **Delete the document** from Firestore immediately after the gate closes.

## Prompt for Code Generation
Copy and paste this into an AI to generate your firmware:

```text
Write Arduino C++ code for an ESP32 board using the 'Firebase-ESP-Client' library by mobizt. 

Goal: Connect to Firestore, trigger a relay, and delete the command document after execution to keep the database clean.

Firebase Config:
- Project ID: studio-1536246552-55579
- API Key: AIzaSyC7MOBvS0RvcMn2810Z5I3N8n4RK3IVki4
- Collection Path: gateControl

Hardware Requirements:
- Use GPIO 26 to trigger a Relay (active HIGH).
- Include WiFi connection logic with placeholders for SSID and Password.

Logic:
1. Initialize Firestore connection and listen for new documents in 'gateControl'.
2. When a document is added where the 'command' field is "OPEN":
   - Print the 'memberId' and 'method' to the Serial monitor.
   - Set GPIO 26 to HIGH for 3 seconds, then set it to LOW.
   - IMPORTANT: After the 3 seconds, delete this specific document from Firestore using its ID to keep the queue empty.
3. Ensure the code handles reconnections gracefully.
```

## Security Note
For production use, it is recommended to use Firebase **Anonymous Authentication** on the ESP32 and restrict Firestore Security Rules so that the ESP32 can only read and delete from the `gateControl` collection.
