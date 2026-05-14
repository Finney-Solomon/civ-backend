const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const { MagazineSection } = require('../models');
const {
  setEditionAudioAvailability,
  syncEditionAudioAvailability,
} = require('./editionAudio.service');
const { uploadBuffer, deleteFile } = require('../utils/s3.util');
const config = require('../config');
const { convert } = require('html-to-text');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: config.elevenlabs.apiKey,
});

/**
 * Aggregate and clean section content for TTS
 * Combines: Title → Subtitle → Summary → Body (HTML stripped)
 */
const _prepareContent = (section) => {
  const { title, subtitle, summary, body } = section.content || {};

  const plainBody = convert(body || '', {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });

  const fullText = [title, subtitle, summary, plainBody]
    .filter(Boolean)
    .join('. ');

  return fullText;
};

/**
 * SHA-256 hash of text + voice + model for cost-control caching
 */
const _generateHash = (text, voiceId, modelId) => {
  return crypto.createHash('sha256')
    .update(`${text}|${voiceId}|${modelId}`)
    .digest('hex');
};

/**
 * Collect all chunks from the ElevenLabs stream into a single Buffer
 */
const _streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * Generate TTS audio via ElevenLabs and upload to S3
 * @param {string} sectionId - MongoDB ObjectId
 * @param {boolean} force - Skip hash check and re-generate
 */
const generateAudio = async (sectionId, force = false) => {
  const section = await MagazineSection.findById(sectionId);
  if (!section) throw new Error('Section not found');

  const textToSpeak = _prepareContent(section);
  if (!textToSpeak.trim()) throw new Error('Section has no content to generate audio');

  const voiceId = config.elevenlabs.voiceId;
  const modelId = config.elevenlabs.modelId;
  const contentHash = _generateHash(textToSpeak, voiceId, modelId);

  // Return cached audio if content hasn't changed
  if (
    !force &&
    section.content.audio?.content_hash === contentHash &&
    section.content.audio?.status === 'generated'
  ) {
    logger.info(`[Audio] Reusing cached audio for section ${sectionId}`);
    await syncEditionAudioAvailability(section.edition_id);
    return section;
  }

  // Guard: initialize audio subdoc if it came back as null from DB
  if (!section.content.audio || typeof section.content.audio !== 'object') {
    section.content.audio = {};
  }

  // Mark as processing
  section.content.audio.status = 'processing';
  section.content.audio.error_message = '';
  await section.save();

  try {
    // Call ElevenLabs TTS API (streaming)
    const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
      text: textToSpeak,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    // Collect stream into Buffer
    const audioBuffer = await _streamToBuffer(audioStream);

    // Upload MP3 to S3
    const key = `sections/audio/${sectionId}-${Date.now()}.mp3`;
    const publicUrl = await uploadBuffer(audioBuffer, key, 'audio/mpeg');

    // Save metadata to section
    section.content.audio = {
      url: publicUrl,
      key: key,
      mime_type: 'audio/mpeg',
      size_bytes: audioBuffer.length,
      status: 'generated',
      content_hash: contentHash,
      text_length: textToSpeak.length,
      voice: voiceId,
      language: 'en',
      provider: 'elevenlabs',
      generated_at: new Date(),
      is_cached: false,
      error_message: '',
    };

    await section.save();
    await syncEditionAudioAvailability(section.edition_id);
    logger.info(`[Audio] Generated ${audioBuffer.length} bytes for section ${sectionId}`);
    return section;
  } catch (error) {
    logger.error({ error, sectionId }, '[Audio] ElevenLabs TTS generation failed');
    section.content.audio.status = 'failed';
    section.content.audio.error_message = error.message;
    await section.save();
    await setEditionAudioAvailability(section.edition_id, false);
    throw error;
  }
};

/**
 * Delete audio from S3 and reset section audio metadata
 */
const deleteAudio = async (sectionId) => {
  const section = await MagazineSection.findById(sectionId);
  if (!section) throw new Error('Section not found');

  const audioKey = section.content.audio?.key;
  if (audioKey) {
    await deleteFile(audioKey);
    logger.info(`[Audio] Deleted S3 object: ${audioKey}`);
  }

  section.content.audio = {
    status: 'not_generated',
    url: '',
    key: '',
    content_hash: '',
    error_message: '',
  };

  await section.save();
  await setEditionAudioAvailability(section.edition_id, false);
  return section;
};

/**
 * TEST ONLY: Generate audio buffer from ElevenLabs without S3 upload.
 * Returns raw MP3 Buffer so the controller can stream it to client.
 * Remove once S3 is configured.
 */
const testGenerateBuffer = async (sectionId) => {
  const section = await MagazineSection.findById(sectionId);
  if (!section) throw new Error('Section not found');

  const textToSpeak = _prepareContent(section);
  if (!textToSpeak.trim()) throw new Error('Section has no content to generate audio');

  const voiceId = config.elevenlabs.voiceId;
  const modelId = config.elevenlabs.modelId;

  logger.info(`[Audio-Test] Generating ${textToSpeak.length} chars for section ${sectionId}`);

  const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
    text: textToSpeak,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  });

  const audioBuffer = await _streamToBuffer(audioStream);
  logger.info(`[Audio-Test] Got ${audioBuffer.length} bytes from ElevenLabs`);

  return audioBuffer;
};

module.exports = {
  generateAudio,
  deleteAudio,
  testGenerateBuffer,
};
