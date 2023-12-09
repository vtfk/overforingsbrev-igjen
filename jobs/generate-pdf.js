const axios = require('../lib/axios-instance').getAxiosInstance()
const { logger } = require('@vtfk/logger')
const { VTFK_PDF_URL } = require('../config')

const generatePdf = async (documentData, jobDefinition) => {
  logger('info', ['generatePdf', 'Trying to call archive'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in generatePdfJob')
  }

  const pdfPayload = jobDefinition.mapper(documentData)

  logger('info', ['generatePdf', 'Calling pdf-api with mapper payload'])
  const { data } = await axios.post(VTFK_PDF_URL, pdfPayload)
  logger('info', ['generatePdf', 'Succesfully called  pdf-api'])
  return data.data.base64
}

module.exports = { generatePdf }
