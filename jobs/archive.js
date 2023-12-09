const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const archive = async (documentData, jobDefinition) => {
  logger('info', ['archive', 'Trying to call archive'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in archiveJob')
  }

  const archivePayload = jobDefinition.mapper(documentData)

  logger('info', ['archive', 'Calling archive with mapper payload'])
  const response = await callArchive('archive', archivePayload)
  logger('info', ['archive', 'Succesfully called archive'])
  return response
}

module.exports = { archive }
