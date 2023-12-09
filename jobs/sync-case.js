const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const syncCase = async (documentData, jobDefinition) => {
  logger('info', ['syncCase', 'Trying to sync case'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in syncCaseJob')
  }
  if (jobDefinition.getCasePayload) {
    logger('info', ['syncCase', 'getCasePayload is present, searching for Case before creating'])

    const getCasePayload = jobDefinition.getCasePayload(documentData)

    logger('info', ['syncCase', 'Calling archive with getCasePayload payload'])
    const getCasesResponse = await callArchive('archive', getCasePayload)
    if (getCasesResponse.length > 0) {
      if (getCasesResponse.length > 1) {
        logger('warn', ['syncCase', `Found more than one case, returning first one. Found totally ${getCasesResponse.length} cases`])
      }
      logger('info', ['syncCase', 'Found case from getCaseParameter, returning instead of creating new'])
      return { CaseNumber: getCasesResponse[0].CaseNumber, Recno: getCasesResponse[0].Recno, caseCreated: false }
    }
    logger('info', ['syncCase', 'Could not find any cases with getCaseParameter, will try to create new'])
  }

  const createCasePayload = jobDefinition.mapper(documentData)

  logger('info', ['syncCase', 'Calling archive with mapper payload'])
  const response = await callArchive('archive', createCasePayload)
  logger('info', ['syncCase', `Succesfully created Case: ${response.CaseNumber}`])
  return { ...response, caseCreated: true }
}

module.exports = { syncCase }
