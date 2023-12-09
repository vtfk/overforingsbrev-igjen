const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const closeCase = async (documentData, jobDefinition) => {
  logger('info', ['archive', 'Trying to close case'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in archiveJob')
  }

  const { CaseNumber } = jobDefinition.mapper(documentData)
  if (!CaseNumber) throw new Error('Mapper in closeCaseJob must return "CaseNumber" to be able to close case')

  const payload = {
    service: 'CaseService',
    method: 'UpdateCase',
    parameter: {
      CaseNumber,
      Status: 'A'
    }
  }

  logger('info', ['archive', 'Calling archive with mapper payload'])
  const response = await callArchive('archive', payload)
  logger('info', ['archive', 'Succesfully called archive'])
  return response
}

module.exports = { closeCase }
