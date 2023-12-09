const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const syncProject = async (documentData, jobDefinition) => {
  logger('info', ['syncProject', 'Trying to sync project'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in syncProjectJob')
  }
  if (jobDefinition.getProjectPayload) {
    logger('info', ['syncProject', 'getProjectPayload is present, searching for Project before creating'])

    const getProjectPayload = jobDefinition.getProjectPayload(documentData)

    logger('info', ['syncProject', 'Calling archive with getProjectPayload payload'])
    const getProjectsResponse = await callArchive('archive', getProjectPayload)
    if (getProjectsResponse.length > 0) {
      if (getProjectsResponse.length > 1) {
        logger('warn', ['syncProject', `Found more than one project, returning first one. Found totally ${getProjectsResponse.length} projects`])
      }
      logger('info', ['syncProject', 'Found project from getProjectParameter, returning instead of creating new'])
      return { ProjectNumber: getProjectsResponse[0].ProjectNumber, Recno: getProjectsResponse[0].Recno, projectCreated: false }
    }
    logger('info', ['syncProject', 'Could not find any projects with getProjectParameter, will try to create new'])
  }

  const createProjectPayload = jobDefinition.mapper(documentData)

  logger('info', ['syncProject', 'Calling archive with mapper payload'])
  const response = await callArchive('archive', createProjectPayload)
  logger('info', ['syncProject', `Succesfully created Project: ${response.ProjectNumber}`])
  return { ...response, projectCreated: true }
}

module.exports = { syncProject }
