# HealthPal: AI-Health Companion

> Developed by **suki to sukses**:
> - **Inashaura Azkazola R.**
> - **Najwa Zikrika F.**

HealthPal is a holistic AI wellness platform that helps users manage their health, daily habits, and personal wellbeing in one intuitive experience. It combines smart health tracking, AI-guided insights, and a friendly conversational interface to make self-care more actionable and accessible.


## The Problem
Many people struggle with two interconnected challenges at once: declining mental wellbeing and poor financial awareness. Stress, unhealthy habits, and limited guidance often lead to reactive decisions instead of proactive care. HealthPal is built to address this gap by bringing wellness support and practical insight into one simple companion.

## The Solution (HealthPal)
HealthPal acts as an AI-powered digital companion that offers personalized wellness suggestions, habit tracking, health screening prompts, and supportive conversations. The experience is designed to feel empathetic, practical, and useful for everyday decision-making.

## AMD & Fireworks AI Infrastructure
HealthPal is powered by the Fireworks AI platform, running optimized inference for high-throughput and low-latency delivery. The AI architecture leverages:
- **Text Chat**: Qwen 2.5 72B Instruct (`accounts/fireworks/models/qwen2p5-72b-instruct`)
- **Multimodal Vision**: Qwen 2 VL 7B Instruct (`accounts/fireworks/models/qwen2-vl-7b-instruct`)
- **Text-to-Speech (TTS)**: F5-TTS (`accounts/fireworks/models/f5-tts`)

This setup is optimized for AMD-based compute infrastructure and developer cloud environments.

## Backend API Endpoints

All external AI requests are routed through backend proxy endpoints to keep API keys secure.

### 1. Chat Completion API
*   **Endpoint**: `POST /api/chat`
*   **Description**: Handles text-only chat requests.
*   **Request Body**:
    ```json
    {
      "prompt": "User message / health inquiry"
    }
    ```
*   **Response**:
    ```json
    {
      "text": "Response from Qwen 2.5 72B..."
    }
    ```

### 2. Vision API (Multimodal)
*   **Endpoint**: `POST /api/vision`
*   **Description**: Processes images (e.g. food logs, skin conditions, medicine labels) with a text prompt.
*   **Request Body**:
    ```json
    {
      "prompt": "Explain what this is",
      "imageBase64": "data:image/jpeg;base64,...",
      "mimeType": "image/jpeg" (Optional)
    }
    ```
*   **Response**:
    ```json
    {
      "text": "Analysis and wellness insights..."
    }
    ```

### 3. Text-to-Speech (TTS) API
*   **Endpoint**: `POST /api/tts`
*   **Description**: Synthesizes speech from text input.
*   **Request Body**:
    ```json
    {
      "text": "Text to convert to speech",
      "voice": "default" (Optional)
    }
    ```
*   **Response**: Audio stream (`audio/mpeg` format)

---

## Key Features
- AI-driven wellness analysis and recommendations
- Multimodal capability (image upload & analysis)
- Smart Text-to-Speech (TTS) voice playback
- Personalized habit and health tracking
- Conversational health companion experience
- Docker-ready deployment for AMD-compatible environments
- English-first interface for broad usability

## Technical Stack
- **Frontend**: TypeScript, React, Vite
- **Backend/runtime**: Express / Node.js
- **AI integration**: Fireworks AI (Qwen 2.5 72B, Qwen 2 VL 7B, F5-TTS)
- **Deployment**: Docker, linux/amd64 containerization

## Docker Deployment (AMD Optimized)
### Prerequisites
- Docker Desktop or Docker Engine installed and running
- Optional: WSL 2 on Windows for better performance

### Build the image
```bash
docker buildx build --platform linux/amd64 -t healthpal-ai .
```

### Run the container
```bash
docker run --rm -p 3000:3000 --env-file .env.local --name healthpal-ai healthpal-ai
```

Then open http://localhost:3000 in your browser.

## Run Locally
### Prerequisites
- Node.js 20 or newer
- A valid Fireworks API key

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/inashauraazkazola/Healthpal-AI-Health-Companion.git
   cd Healthpal-AI-Health-Companion
   ```
   
2. Install dependencies:
   ```bash
   npm install
   ```
   
3. Create a `.env` file and set your API key:
   ```env
   FIREWORKS_API_KEY=your_api_key_here
   ```
   
4. Start the development server:
   ```bash
   npm run dev
   ```

## Production Build
```bash
npm run build
```

## License
This project is licensed under the MIT License.

