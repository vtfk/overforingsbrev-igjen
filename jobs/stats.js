const { logger } = require('@vtfk/logger')
const axios = require('../lib/axios-instance').getAxiosInstance()
const { name, version } = require('../package.json')
const { TFK_COUNTY, VFK_COUNTY, VFK_STATS, TFK_STATS } = require('../config')

const stats = async (documentData, jobDefinition, flowDefinition) => {
  logger('info', ['stats', 'Creating statistics element'])

  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in statsJob')
  }

  const jobs = Object.keys(flowDefinition).join(', ')

  const statProperties = jobDefinition.mapper(documentData)

  const statisticsPayload = {
    system: 'dos-arkivaros', // Required. System name. New system creates a new collection
    engine: `${name} ${version}`,
    ...statProperties,
    jobs
  }

  // VFK stats
  if (documentData.flowStatus.county.NAME === VFK_COUNTY.NAME) {
    logger('info', ['statistics', 'Posting stats to vfk database'])
    const { data } = await axios.post(VFK_STATS.URL, statisticsPayload, { headers: { 'x-functions-key': VFK_STATS.KEY } })
    logger('info', ['statistics', 'Stats successfully created, great success'])
    return {
      data
    }
  } else if (documentData.flowStatus.county.NAME === TFK_COUNTY.NAME) { // TFK STATS
    logger('info', ['statistics', 'Posting stats to tfk database'])
    const { data } = await axios.post(TFK_STATS.URL, statisticsPayload, { headers: { 'x-functions-key': TFK_STATS.KEY } })
    logger('info', ['statistics', 'Stats successfully created, great success'])
    return {
      data
    }
  } else {
    throw new Error(`Could not find a matching county for stats... documentData county: ${documentData.flowStatus.county.NAME}, did not match TFK county name or VFK conty name from config`)
  }
}

module.exports = { stats }
