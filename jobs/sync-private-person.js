const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const syncPrivatePerson = async (documentData, jobDefinition) => {
  logger('info', ['syncPrivatePerson', 'Trying to sync privatePerson'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in syncPrivatePersonJob')
  }
  const syncPrivatePersonPayload = jobDefinition.mapper(documentData)

  logger('info', ['syncPrivatePerson', 'Calling archive with mapper payload'])
  const response = await callArchive('syncPrivatePerson', syncPrivatePersonPayload, documentData.flowStatus.county)
  logger('info', ['syncPrivatePerson', 'Succesfully synced privatePerson'])
  return response
}

module.exports = { syncPrivatePerson }
