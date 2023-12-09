const axios = require('../lib/axios-instance').getAxiosInstance()
const { logger } = require('@vtfk/logger')
const { VTFK_MAIL } = require('../config')

const sendEmail = async (documentData, jobDefinition) => {
  logger('info', ['sendEmail', 'Trying to send email'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in sendEmailJob')
  }

  const mailPayload = jobDefinition.mapper(documentData)

  logger('info', ['sendEmail', 'Calling mail-api with mapper payload'])
  const { data } = await axios.post(VTFK_MAIL.URL, mailPayload, { headers: { 'Ocp-Apim-Subscription-Key': VTFK_MAIL.KEY } })
  logger('info', ['sendEmail', 'Succesfully called mail-api'])
  return data
}

module.exports = { sendEmail }
