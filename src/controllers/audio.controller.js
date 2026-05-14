const audioService = require('../services/audio.service');
const ApiResponse = require('../utils/apiResponse');

const generate = async (req, res, next) => {
  try {
    const section = await audioService.generateAudio(req.params.id);
    return ApiResponse.success(res, section, 'Audio generated successfully', 201);
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const regenerate = async (req, res, next) => {
  try {
    const section = await audioService.generateAudio(req.params.id, true);
    return ApiResponse.success(res, section, 'Audio regenerated successfully');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

// route uses audioController.delete
const deleteAudio = async (req, res, next) => {
  try {
    const section = await audioService.deleteAudio(req.params.id);
    return ApiResponse.success(res, section, 'Audio deleted successfully');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

/**
 * TEST ONLY: Stream audio back directly (no S3)
 * Remove once S3 is configured.
 */
const testGenerate = async (req, res, next) => {
  try {
    const audioBuffer = await audioService.testGenerateBuffer(req.params.id);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': `attachment; filename="section-${req.params.id}.mp3"`,
    });

    return res.send(audioBuffer);
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

module.exports = {
  generate,
  regenerate,
  delete: deleteAudio,
  testGenerate,
};
