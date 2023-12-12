const { readdirSync } = require('fs')
const { handleDocument } = require('./handle-document')
const { logConfig, logger } = require('@vtfk/logger')
const { NUMBER_OF_DOCS_TO_HANDLE } = require('../config')

/**
 *
 * @param {Object} county
 * @param {string} county.COUNTY_NUMBER
 * @param {Object} county.NAME
 */
const handleQueue = async (county) => {
  // For hvert dokument i køen - sjekk om det skal kjøres - kjør handledocument
  const queue = readdirSync(`./documents/${county.NAME}/queue`)
  const result = {
    handledDocs: 0,
    waitingDocs: 0,
    skippedDocs: 0,
    unhandledErrors: 0
  }
  for (const document of queue) {
    if (result.handledDocs >= NUMBER_OF_DOCS_TO_HANDLE) {
      logConfig({
        prefix: `handleQueue`
      })
      logger('info', [`We have now handled ${NUMBER_OF_DOCS_TO_HANDLE} documents, which is set as max per run`, 'Will not handle more, before next run. Returning'])
      break
    }
    logConfig({
      prefix: `handleQueue - ${county.NAME} - ${document}`
    })
    logger('info', ['Getting flowStatus, checking if ready for run'])
    let documentData
    try {
      documentData = require(`../documents/${county.NAME}/queue/${document}`)
      if (!documentData.flowStatus) {
        logger('info', ['Flowstatus is missing, first run, setting up flowStatus and type'])
        const documentName = document.substring(0, document.lastIndexOf('.'))
        const documentPath = `./documents/${county.NAME}/queue/${document}`
        const infoList = documentName.split('_')
        if (infoList.length < 2) throw new Error('document name must be on the format "{TYPE}_{ID}.json')
        const documentType = infoList.shift() // Take first element (array is modified)
        const documentId = infoList.join('_') // Join the rest as ID for the doc
        const now = new Date()
        documentData.flowStatus = {
          documentName,
          documentPath,
          documentType,
          documentId,
          county,
          createdTimestamp: now.toISOString(),
          finished: false,
          failed: false,
          wait: false,
          runs: 0,
          nextRun: now.toISOString()
        }
      }
      const now = new Date()
      if (now < new Date(documentData.flowStatus.nextRun)) {
        logger('info', ['Not ready for retry, skipping document for now'])
        result.skippedDocs++
        continue
      }
    } catch (error) {
      logger('error', ['Could not get document json, skipping document. Check error', error.stack || error.toString()])
      result.unhandledErrors++
      continue
    }
    logger('info', ['Getting correct flowDefinition for the document'])
    if (!documentData.flowStatus.documentType) {
      logger('error', [`${document} is missing "documentType", something is very wrong... Please check. skipping document for now`])
      result.unhandledErrors++
      continue
    }
    let flowDefinition
    try {
      flowDefinition = require(`../flows/${documentData.flowStatus.documentType}`)
    } catch (error) {
      logger('error', [`Could not find any flow for documentType ${documentData.flowStatus.documentType}... Please check. Skipping document for now`])
      result.unhandledErrors++
      continue
    }

    logger('info', ['Document is ready for run - lets gooo!'])
    try {
      const status = await handleDocument(documentData, flowDefinition)
      if (status.wait) {
        result.waitingDocs++
        result.handledDocs++
      } else {
        result.handledDocs++
      }
    } catch (error) {
      logger('error', ['Unhandled error! Skipping document - jobs might run again... Please check', error.response?.data || error.stack || error.toString()])
      result.unhandledErrors++
      continue
    }
  }
  return result
}

module.exports = { handleQueue }
