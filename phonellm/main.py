from fastapi import FastAPI, File, UploadFile, HTTPException, Body, Form, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from gtts import gTTS
from openai import OpenAI
from dotenv import load_dotenv
import tempfile, subprocess, os, json
from pathlib import Path
import uuid
import asyncio
import os
import logging
import traceback
from helpers.tts_helpers import generate_greeting_tts
from twilio.twiml.voice_response import VoiceResponse
import requests

load_dotenv()
client = OpenAI()

# Backup OpenAI client (if you add OPENAI_API_KEY_BACKUP in .env)
backup_client = None
backup_key = os.getenv("OPENAI_API_KEY_BACKUP")
if backup_key:
    backup_client = OpenAI(api_key=backup_key)

# Offline fallback responses (if ALL APIs fail, demo still works)
OFFLINE_RESPONSES = {
    "ta-IN": "நன்றி, உங்கள் கேள்வி கிடைத்தது. தயவுசெய்து உள்ளூர் வேளாண் அதிகாரியை அணுகவும்.",
    "hi-IN": "धन्यवाद, आपका सवाल मिला। कृपया स्थानीय कृषि अधिकारी से संपर्क करें।",
    "en-US": "Thank you for your question. For detailed guidance, please contact your local agriculture officer.",
}

app = FastAPI()

# Mount audio directory to serve files to Twilio
AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://nephele-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# SYSTEM PROMPT (Nephele)
# =========================
SYSTEM_PROMPT = """
You are pasumAI AgriAssist, an AI agriculture expert assistant designed to help farmers.

Your role:
You provide reliable agricultural guidance based on modern farming practices, soil science,
crop management, pest control, irrigation, weather awareness, and government schemes.

Your knowledge domain includes:
- Crop cultivation
- Pest and disease management
- Soil health and fertilizers
- Irrigation techniques
- Weather impact on crops
- Sustainable farming
- Organic farming
- Government agricultural schemes
- Market guidance for crops


LANGUAGE RULES:
- You may ONLY speak in English, Tamil, or Hindi.
- If the farmer speaks in Tamil → reply in Tamil.
- If the farmer speaks in Hindi → reply in Hindi.
- Otherwise reply in simple English.
- Never use any other language.


TAMIL DIALECT UNDERSTANDING RULES:

Farmers may speak in different Tamil dialects including rural and regional slang.

Examples include dialects from:
- Madurai Tamil
- Tirunelveli Tamil
- Kongu Tamil
- Southern rural Tamil
- Village colloquial Tamil

Farmers may use informal or shortened speech such as:

Example dialect phrases:
"mazhai varala pa"
"enga oorla thanni illa"
"nelam karanju poiduchu"
"poochi romba jasthi"
"saathu kedachiruku"
"vellam adhigam"

Before answering:

1. First understand the meaning of the dialect sentence.
2. Internally normalize it into clear standard Tamil.
3. Then answer the question.

Do NOT correct the farmer's language or criticize their dialect.

Never tell the farmer you are normalizing their dialect.

Simply understand and respond naturally.


AGRICULTURE VOCABULARY AWARENESS:

Farmers may use local farming terms such as:

- nelam (field)
- thanni (water)
- vayal (paddy field)
- mann (soil)
- poochi (pests)
- vithai (seed)
- uram (fertilizer)
- pasu / erumai (livestock)
- saathu (crop condition)
- vaikkal (irrigation canal)

Understand these terms correctly when answering.


RESPONSE STYLE:
- Keep responses short and practical.
- Prefer 1–3 sentences.
- Speak in simple farmer-friendly language.
- Avoid technical jargon unless necessary.
- Never use emojis in spoken responses.
- Never read punctuation or symbols aloud.


SAFETY RULES:
- Do not invent facts.
- If unsure, say: "I'm not completely sure, please consult a local agriculture expert."
- Do not give dangerous or illegal advice.
- Do not give medical advice.
- Do not provide chemical pesticide quantities unless confident.


FARMER-FIRST GUIDELINES:
- Provide practical farming steps.
- Suggest sustainable and affordable solutions.
- When possible, suggest local practices commonly used by farmers.
- Encourage soil testing and expert consultation when required.


CONVERSATION STYLE:
- Speak naturally like a helpful agriculture officer.
- Be respectful and supportive.
- If the farmer question is unclear, ask a short clarification question.


IDENTITY RULE:
If the user asks who built you, created you, or developed you, respond with:

"I was built by Saravana Priyan C."

Do not mention OpenAI, APIs, models, or any external companies.


Always prioritize helping farmers with clear, safe, and practical agricultural advice.
"""
# =========================
# LOGGING AND UTILS
# =========================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)


# =========================
# AUDIO NORMALIZATION
# =========================

def _safe_suffix(file_name: str | None, mime_type: str | None) -> str:
    if file_name:
        ext = Path(file_name).suffix.strip().lower()
        if ext:
            return ext

    mime_map = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".mp4",
        "audio/aac": ".aac",
        "audio/x-m4a": ".m4a",
        "audio/flac": ".flac",
    }

    if mime_type:
        normalized = mime_type.split(";")[0].strip().lower()
        if normalized in mime_map:
            return mime_map[normalized]

    return ".webm"


def _run_ffmpeg(input_path: str, output_path: str) -> bool:
    """
    Normalize audio for Whisper / OpenAI STT.
    Converts anything → 16k mono WAV.
    Returns True if successful, False if ffmpeg is missing or failed.
    """
    ffmpeg_bin = os.getenv("FFMPEG_PATH", "ffmpeg")

    try:
        process = subprocess.run(
            [
                ffmpeg_bin,
                "-y",
                "-i",
                input_path,
                "-ac", "1",
                "-ar", "16000",
                output_path
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if process.returncode != 0:
            logger.error("ffmpeg failed: %s", process.stderr.strip())
            return False

        return True
    except FileNotFoundError:
        logger.warning("ffmpeg NOT found on this system. Skipping normalization...")
        return False
    except Exception as e:
        logger.error(f"ffmpeg cleanup/proc error: {e}")
        return False


# =========================
# CLASS FOR QR ENDPOINT
# =========================

class ScanData(BaseModel):
    name: str
    roll_no: str
    role: str


class ChatPayload(BaseModel):
    message: str

@app.post("/scan")
async def scan_endpoint(data: ScanData, background_tasks: BackgroundTasks):
    """
    QR scan endpoint that returns a greeting audio TTS.
    """
    return await generate_greeting_tts(
        name=data.name,
        role=data.role,
        background_tasks=background_tasks
    )

# =========================
# AGENT PRIMITIVES
# =========================

""" async def transcribe_audio(file: UploadFile) -> str:
    try:
        audio_bytes = await file.read()

        transcription = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=(file.filename or "audio.webm", audio_bytes),
            prompt="Tamil Hindi English agriculture farming crops soil irrigation pest farmers"
        )

        text = transcription.text.strip()


        logger.info(f"STT result: {text}")

        return text

    except Exception as e:
        logger.error(f"STT failed: {e}")
        return "" """
        
async def transcribe_audio(file: UploadFile) -> str:
    """
    Robust STT pipeline for browser recordings.
    Handles webm/ogg/mp3/wav safely.
    """

    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files supported")

    suffix = _safe_suffix(file.filename, file.content_type)
    input_path = os.path.join(tempfile.gettempdir(), f"input_{uuid.uuid4().hex}{suffix}")
    try:
        raw_bytes = await file.read()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Empty audio upload")
            
        with open(input_path, "wb") as f_input:
            f_input.write(raw_bytes)
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise e

    wav_path = f"{input_path}.wav"
    use_converted = False

    try:
        # Try to normalize with ffmpeg if possible
        if _run_ffmpeg(input_path, wav_path):
            use_converted = True

        final_path = wav_path if use_converted else input_path

        with open(final_path, "rb") as audio_stream:
            result = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_stream,
                prompt="Tamil Hindi English agriculture farming crops soil irrigation pest farmers"
            )

        text = (getattr(result, "text", "") or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Unable to transcribe clearly. Please speak again.")

        logger.info(f"STT result: {text}")

        return text

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT failed: {e}")
        raise HTTPException(status_code=503, detail="Voice transcription service temporarily unavailable")

    finally:
        for path in (input_path, wav_path):
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass
    return "" # Should not be reached due to raise

def think_stream(user_text: str, history=None):
    """Stream GPT response token by token. Optionally include conversation history."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages += history
    messages.append({"role": "user", "content": user_text})

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        stream=True,
        messages=messages,
    )
    for chunk in stream:
        content = getattr(chunk.choices[0].delta, "content", None)
        if content:
            yield content


def token_buffer(tokens, size=40):
    """Buffer small GPT tokens into larger chunks for TTS efficiency."""
    buf = ""
    for t in tokens:
        buf += t
        if len(buf) >= size:
            yield buf
            buf = ""
    if buf:
        yield buf


def speak_stream(text_chunks):
    """Convert text chunks into streamed audio, stripping WAV headers after the first chunk."""
    first = True
    for text in text_chunks:
        audio_bytes = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        ).read()
        if first:
            first = False
            yield audio_bytes  # full WAV for first chunk
        else:
            yield audio_bytes[44:]  # strip header for subsequent chunks


def speak_text(text: str) -> bytes:
    """TTS for single text input."""
    return client.audio.speech.create(
        model="tts-1",
        voice="alloy",
        input=text
    ).read()

# =========================
# ENDPOINTS
# =========================
@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Backend is running"
    }

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

@app.post("/voice")
async def voice(file: UploadFile = File(...)):
    """STT endpoint: audio → text"""
    if not file:
        raise HTTPException(status_code=400, detail="Audio file required")
    text = await transcribe_audio(file)
    return JSONResponse({"transcript": text, "text": text})


@app.post("/tts")
async def tts(payload: dict = Body(...)):
    """TTS endpoint: text → audio"""
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    audio_bytes = speak_text(text)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.post("/chat")
async def chat(payload: ChatPayload = Body(...)):
    """Direct text chat endpoint: text -> assistant text."""
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
        )
        reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            raise HTTPException(status_code=502, detail="AI returned an empty chat reply")
        return JSONResponse({"reply": reply, "text": reply, "message": reply})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/chat failed: {e}")
        raise HTTPException(status_code=503, detail="Chat service temporarily unavailable")


@app.post("/agent")
async def agent(file: UploadFile = File(...)):
    """Full voice agent: audio → GPT → streamed audio"""
    if not file:
        raise HTTPException(status_code=400, detail="Audio required")

    user_text = await transcribe_audio(file)
    if not user_text.strip():
        audio_bytes = speak_text("I didn't catch that. Could you repeat?")
        return Response(content=audio_bytes, media_type="audio/wav")

    tokens = think_stream(user_text)
    buffered_tokens = token_buffer(tokens)
    audio_stream = speak_stream(buffered_tokens)

    return StreamingResponse(audio_stream, media_type="audio/wav")


@app.post("/agent-memory")
async def agent_memory(file: UploadFile = File(...), history: str = Form(...)):
    """Full voice agent with conversation memory (stateless server)"""
    if not file:
        raise HTTPException(status_code=400, detail="Audio file required")

    # STT
    user_text = await transcribe_audio(file)

    if not user_text.strip():
        audio_bytes = speak_text("I didn't catch that. Could you repeat?")
        return Response(content=audio_bytes, media_type="audio/wav")

    # Conversation memory from client
    conversation = json.loads(history)
    conversation.append({"role": "user", "content": user_text})

    # GPT response
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + conversation
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    assistant_text = completion.choices[0].message.content
    conversation.append({"role": "assistant", "content": assistant_text})

    # TTS
    audio_bytes = speak_text(assistant_text)
    return Response(content=audio_bytes, media_type="audio/wav")



# =========================
# COMPERE ENDPOINT
# =========================


@app.post("/compere")
async def text_to_speech(file: UploadFile = File(...)):
    logger.info("/tts request received")

    try:
        logger.info("Reading uploaded file")
        content = await file.read()
        text = content.decode("utf-8").strip()

        if not text:
            raise HTTPException(status_code=400, detail="Text file is empty")

        logger.info(f"Text length: {len(text)} characters")

        audio_id = str(uuid.uuid4())
        audio_path = f"{AUDIO_DIR}/{audio_id}.wav"

        logger.info("Calling OpenAI TTS API")

        with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="alloy",
            input=text,
            timeout=30,  # IMPORTANT: prevent hanging forever
        ) as response:
            logger.info("Streaming audio to file")
            response.stream_to_file(audio_path)

        logger.info(f"Audio saved: {audio_path}")

        return FileResponse(
            audio_path,
            media_type="audio/wav",
            filename="speech.wav",
        )

    except Exception as e:
        logger.error("ERROR during /tts processing")
        logger.error(str(e))
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="TTS generation failed")

# =========================
# CUSTOM AUDIO ENDPOINT FOR TWILIO
# =========================
# This serves audio files through a proper API endpoint instead of StaticFiles.
# ngrok's free tier interstitial page blocks StaticFiles but not API endpoints.

@app.get("/twilio-audio/{filename}")
async def serve_twilio_audio(filename: str):
    """Serve audio files to Twilio without ngrok interstitial interference."""
    file_path = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(
        file_path,
        media_type="audio/mpeg",
        filename=filename
    )

# =========================
# TELEPHONY ENDPOINTS (TWILIO)
# =========================

def _ask_to_repeat():
    """Helper: return TwiML that politely asks the user to repeat and records again."""
    response = VoiceResponse()
    response.say(
        "Sorry, I could not understand your audio clearly. Could you please repeat that?",
        voice="alice"
    )
    response.record(
        action="/twilio/handle-response",
        method="POST",
        maxLength=30,
        trim="trim-silence",
        playBeep=True
    )
    return Response(content=str(response), media_type="application/xml")


@app.post("/twilio/voice")
async def twilio_voice():
    """Initial call handler: Greets and starts recording."""
    response = VoiceResponse()

    # Greeting with a slight pause to allow the user to hear clearly
    response.say(
        "Hello! Welcome to Pasumai Cholai AI. Please tell me your question after the beep.",
        voice="alice"
    )
    response.pause(length=1)

    # Record the user's voice
    response.record(
        action="/twilio/handle-response",
        method="POST",
        maxLength=30,
        trim="trim-silence",
        playBeep=True
    )

    return Response(content=str(response), media_type="application/xml")


async def delayed_delete(file_path: str, delay: int = 60):
    """Wait and then delete a file."""
    try:
        await asyncio.sleep(delay)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted temporary audio: {file_path}")
            except Exception as e:
                logger.error(f"Error in delayed_delete: {e}")
    except asyncio.CancelledError:
        # Server is shutting down, clean up immediately
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass


@app.post("/twilio/handle-response")
async def twilio_handle_response(request: Request, background_tasks: BackgroundTasks):
    """Processes the recording and responds back to the caller."""
    form_data = await request.form()
    recording_url = form_data.get("RecordingUrl")

    logger.info(f"Twilio Callback received. Form data: {dict(form_data)}")

    if not recording_url:
        logger.warning("No recording URL received from Twilio.")
        return _ask_to_repeat()

    logger.info(f"Processing phone recording: {recording_url}")

    try:
        # 1. Download the audio file from Twilio as MP3
        # AUTO-DETECT which Twilio account sent the call
        callback_sid = form_data.get("AccountSid", "")
        
        # Build credentials map from .env
        twilio_creds = {}
        sid1 = os.getenv("TWILIO_ACCOUNT_SID", "")
        tok1 = os.getenv("TWILIO_AUTH_TOKEN", "")
        if sid1 and tok1:
            twilio_creds[sid1] = tok1
        sid2 = os.getenv("TWILIO_ACCOUNT_SID_2", "")
        tok2 = os.getenv("TWILIO_AUTH_TOKEN_2", "")
        if sid2 and tok2:
            twilio_creds[sid2] = tok2

        # Match the calling account's SID to get its auth token
        auth_token = twilio_creds.get(callback_sid, tok1)
        auth_sid = callback_sid if callback_sid in twilio_creds else sid1
        logger.info(f"Using Twilio account: {auth_sid[:10]}...")
        
        download_url = recording_url + ".mp3"
        logger.info(f"Downloading MP3 from Twilio: {download_url}")
        
        audio_response = requests.get(
            download_url,
            auth=(auth_sid, auth_token) if auth_sid and auth_token else None
        )

        if not audio_response.ok:
            logger.error(f"Failed to download recording from Twilio: {audio_response.status_code}")
            return _ask_to_repeat()

        # Verify we got actual audio, not an HTML error page
        content_type = audio_response.headers.get("Content-Type", "")
        if "html" in content_type.lower() or "xml" in content_type.lower():
            logger.error(f"Twilio returned HTML/XML instead of audio. Content-Type: {content_type}")
            logger.error(f"Response body (first 200 chars): {audio_response.text[:200]}")
            return _ask_to_repeat()

        logger.info(f"Downloaded {len(audio_response.content)} bytes of audio (Content-Type: {content_type})")

        # Save to a temp file
        temp_path = os.path.join(tempfile.gettempdir(), f"twilio_{uuid.uuid4().hex}.mp3")
        with open(temp_path, "wb") as f:
            f.write(audio_response.content)

        # 2. Transcribe directly with OpenAI Whisper (skip the MockFile pattern)
        user_text = ""
        try:
            with open(temp_path, "rb") as audio_file:
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    prompt="Tamil Hindi English agriculture farming crops soil irrigation pest farmers"
                )
            user_text = (getattr(result, "text", "") or "").strip()
            logger.info(f"Phone STT result: {user_text}")
        except Exception as stt_err:
            logger.error(f"Phone STT failed: {stt_err}")
            logger.error(traceback.format_exc())
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # If transcription is empty or failed, politely ask user to repeat
        if not user_text:
            logger.warning("Transcription returned empty text. Asking user to repeat.")
            return _ask_to_repeat()

        # 3. Detect INPUT language (needed for offline fallback)
        def _detect_lang(text):
            tamil = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
            hindi = sum(1 for c in text if '\u0900' <= c <= '\u097F')
            total = max(len(text), 1)
            if tamil / total > 0.1:
                return "ta-IN"
            if hindi / total > 0.1:
                return "hi-IN"
            return "en-US"

        input_lang = _detect_lang(user_text)
        logger.info(f"Input language: {input_lang}")

        # 4. AI Brain (GPT) - 3-TIER FAILOVER CHAIN
        phone_system_prompt = SYSTEM_PROMPT + """

PHONE CALL RULES (CRITICAL):
- You are on a PHONE CALL. Keep answers to 1-2 short sentences MAXIMUM.
- No bullet points, numbered lists, markdown, asterisks, or special characters.
- Speak naturally like talking face-to-face.
- Reply in the SAME language the farmer used.
- Give only the most important tip.
"""
        gpt_messages = [
            {"role": "system", "content": phone_system_prompt},
            {"role": "user", "content": user_text},
        ]

        ai_reply = None

        # TIER 1: Primary OpenAI key
        try:
            logger.info("TIER 1: Trying primary OpenAI key...")
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=gpt_messages,
                max_tokens=100,
                timeout=8,
            )
            ai_reply = completion.choices[0].message.content
            logger.info("TIER 1 SUCCESS")
        except Exception as e1:
            logger.error(f"TIER 1 FAILED: {e1}")

        # TIER 2: Backup OpenAI key
        if not ai_reply and backup_client:
            try:
                logger.info("TIER 2: Trying backup OpenAI key...")
                completion = backup_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=gpt_messages,
                    max_tokens=100,
                    timeout=8,
                )
                ai_reply = completion.choices[0].message.content
                logger.info("TIER 2 SUCCESS")
            except Exception as e2:
                logger.error(f"TIER 2 FAILED: {e2}")

        # TIER 3: Offline hardcoded response (NEVER fails)
        if not ai_reply:
            logger.warning("TIER 3: Using offline fallback response")
            ai_reply = OFFLINE_RESPONSES.get(input_lang, OFFLINE_RESPONSES["en-US"])

        # Strip markdown characters that TTS can't handle
        ai_reply = ai_reply.replace("*", "").replace("#", "").replace("_", "")
        # Truncate if too long
        if len(ai_reply) > 200:
            ai_reply = ai_reply[:200].rsplit(" ", 1)[0] + "."
        logger.info(f"GPT reply ({len(ai_reply)} chars): {ai_reply}")

        # 5. Build response with correct voice for the language
        lang = _detect_lang(ai_reply) if ai_reply else input_lang
        # If reply detection fails, use input language
        if lang == "en-US" and input_lang != "en-US":
            lang = input_lang
        logger.info(f"Output language: {lang}")

        response = VoiceResponse()
        
        if lang == "ta-IN":
            response.say(ai_reply, voice="Google.ta-IN-Standard-A", language="ta-IN")
        elif lang == "hi-IN":
            response.say(ai_reply, voice="Google.hi-IN-Standard-A", language="hi-IN")
        else:
            response.say(ai_reply, voice="alice", language="en-US")

        # Redirect back to recording
        response.record(
            action="/twilio/handle-response",
            method="POST",
            maxLength=30,
            trim="trim-silence",
            playBeep=True
        )

        return Response(content=str(response), media_type="application/xml")

    except Exception as e:
        logger.error(f"Error handling Twilio response: {e}")
        logger.error(traceback.format_exc())
        # Last resort: speak error in English (always works)
        response = VoiceResponse()
        response.say("Sorry, there was a small issue. Please ask your question again after the beep.", voice="alice")
        response.record(
            action="/twilio/handle-response",
            method="POST",
            maxLength=30,
            trim="trim-silence",
            playBeep=True
        )
        return Response(content=str(response), media_type="application/xml")


# =========================
# AWS LAMBDA HANDLER
# =========================
# To deploy on AWS Lambda, install mangum: pip install mangum
# Then point your Lambda handler to main.handler
try:
    from mangum import Mangum
    handler = Mangum(app)
    logger.info("Mangum handler loaded - ready for AWS Lambda deployment")
except ImportError:
    # Running locally, mangum not needed
    pass