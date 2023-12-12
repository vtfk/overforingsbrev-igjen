require('dotenv').config()

const RETRY_INTERVALS_MINUTES = (process.env.RETRY_INTERVALS_MINUTES && process.env.RETRY_INTERVALS_MINUTES.split(',').map(numStr => Number(numStr))) || [15, 60, 240, 3600, 3600]

module.exports = {
  OVERRIDE_TO_VTFK_ARCHIVE: (process.env.OVERRIDE_TO_VTFK_ARCHIVE && process.env.OVERRIDE_TO_VTFK_ARCHIVE === 'true') || false, // ENDRE TIL DEFAULT false, når tiden er inne
  NODE_ENV: process.env.NODE_ENV || 'dev',
  VFK_COUNTY: {
    COUNTY_NUMBER: process.env.VFK_COUNTY_NUMBER || '39',
    NAME: process.env.VFK_COUNTY_NAME || 'vestfold',
    DISPLAY_NAME: process.env.VFK_COUNTY_DISPLAY_NAME || 'Vestfold fylkeskommune',
    CEO_NAME: process.env.VFK_COUNTY_CEO_NAME || 'Fru Sjef'
  },
  TFK_COUNTY: {
    COUNTY_NUMBER: process.env.TFK_COUNTY_NUBER || '40',
    NAME: process.env.TFK_COUNTY_NAME || 'telemark',
    DISPLAY_NAME: process.env.TFK_COUNTY_DISPLAY_NAME || 'Telemark fylkeskommune',
    CEO_NAME: process.env.TFK_COUNTY_CEO_NAME || 'Herr Sjef'
  },
  NUMBER_OF_DOCS_TO_HANDLE: Number(process.env.NUMBER_OF_DOCS_TO_HANDLE) ?? 10,
  VTFK_ARCHIVE: {
    URL: process.env.VTFK_ARCHIVE_URL,
    KEY: process.env.VTFK_ARCHIVE_KEY
  },
  VTFK_MAIL: {
    URL: process.env.VTFK_MAIL_URL,
    KEY: process.env.VTFK_MAIL_KEY
  },
  VTFK_PDF_URL: process.env.VTFK_PDF_URL,
  VFK_ARCHIVE: {
    URL: process.env.VFK_ARCHIVE_URL,
    CLIENT_ID: process.env.VFK_ARCHIVE_CLIENT_ID,
    CLIENT_SECRET: process.env.VFK_ARCHIVE_CLIENT_SECRET,
    TENANT_ID: process.env.VFK_ARCHIVE_TENANT_ID,
    SCOPE: process.env.VFK_ARCHIVE_SCOPE
  },
  TFK_ARCHIVE: {
    URL: process.env.TFK_ARCHIVE_URL,
    CLIENT_ID: process.env.TFK_ARCHIVE_CLIENT_ID,
    CLIENT_SECRET: process.env.TFK_ARCHIVE_CLIENT_SECRET,
    TENANT_ID: process.env.TFK_ARCHIVE_TENANT_ID,
    SCOPE: process.env.TFK_ARCHIVE_SCOPE
  },
  VFK_STATS: {
    URL: process.env.VFK_STATS_URL,
    KEY: process.env.VFK_STATS_KEY
  },
  TFK_STATS: {
    URL: process.env.TFK_STATS_URL,
    KEY: process.env.TFK_STATS_KEY
  },
  RETRY_INTERVALS_MINUTES,
  DELETE_FINISHED_AFTER_DAYS: process.env.DELETE_FINISHED_AFTER_DAYS || '30',
  TEAMS_STATUS_WEBHOOK_URLS: (process.env.TEAMS_STATUS_WEBHOOK_URLS && (process.env.TEAMS_STATUS_WEBHOOK_URLS.split(','))) || []
}
