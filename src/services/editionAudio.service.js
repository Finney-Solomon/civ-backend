const { MagazineEdition, MagazineSection } = require("../models");
const cacheService = require("./cache.service");

const hasGeneratedAudio = (section) => {
  const audio = section?.content?.audio || {};
  return audio.status === "generated" && Boolean(audio.url);
};

const withAudioAvailabilityDefault = (edition) => {
  if (!edition) return edition;
  const data = typeof edition.toObject === "function" ? edition.toObject() : edition;
  return {
    ...data,
    is_audio_available: Boolean(data.is_audio_available),
  };
};

const invalidateEditionAudioCaches = async (editionId) => {
  await cacheService.del(`cache:editionSections:${editionId}`);
  await cacheService.del(`cache:editionDetails:${editionId}`);
  await cacheService.delByPattern("cache:editions:pub:*");
};

const areAllSectionAudiosGenerated = async (editionId) => {
  const sections = await MagazineSection.find({ edition_id: editionId })
    .select("content.audio")
    .lean();

  return sections.length > 0 && sections.every(hasGeneratedAudio);
};

const setEditionAudioAvailability = async (editionId, isAudioAvailable) => {
  const edition = await MagazineEdition.findByIdAndUpdate(
    editionId,
    { $set: { is_audio_available: Boolean(isAudioAvailable) } },
    { new: true, runValidators: true }
  ).lean();

  await invalidateEditionAudioCaches(editionId);
  return edition;
};

const syncEditionAudioAvailability = async (editionId) => {
  const isAudioAvailable = await areAllSectionAudiosGenerated(editionId);
  return setEditionAudioAvailability(editionId, isAudioAvailable);
};

const hideSectionAudio = (section) => {
  const content = { ...(section.content || {}) };
  delete content.audio;
  return { ...section, content };
};

const formatSectionForReader = (section, isEditionAudioAvailable) => {
  if (!isEditionAudioAvailable || !hasGeneratedAudio(section)) {
    return hideSectionAudio(section);
  }

  return section;
};

const formatEditionSectionsForReader = (editionData) => {
  const edition = withAudioAvailabilityDefault(editionData?.edition);
  const isEditionAudioAvailable = Boolean(edition?.is_audio_available);

  return {
    ...editionData,
    edition,
    sections: (editionData.sections || []).map((section) =>
      formatSectionForReader(section, isEditionAudioAvailable)
    ),
  };
};

module.exports = {
  areAllSectionAudiosGenerated,
  formatEditionSectionsForReader,
  formatSectionForReader,
  hasGeneratedAudio,
  setEditionAudioAvailability,
  syncEditionAudioAvailability,
  withAudioAvailabilityDefault,
};
