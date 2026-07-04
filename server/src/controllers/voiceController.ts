import type { Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { processVoiceTranscript, transcribeAudioWithWhisper } from '../services/openaiVoiceService.js';

export const transcribeVoiceListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const audio = req.file;
  if (!audio) {
    throw new ApiError(400, 'Audio file is required');
  }
  if (!audio.mimetype.startsWith('audio/')) {
    throw new ApiError(400, 'Only audio files are supported');
  }
  if (audio.size > 10 * 1024 * 1024) {
    throw new ApiError(400, 'Audio file exceeds the 10MB size limit');
  }

  const transcript = await transcribeAudioWithWhisper(audio.buffer, audio.mimetype || 'audio/webm');
  const processed = await processVoiceTranscript(transcript);

  res.status(200).json({
    success: true,
    data: {
      transcript: processed.transcript,
      cleanedText: processed.cleanedText,
      fields: processed.fields,
    },
  });
});

