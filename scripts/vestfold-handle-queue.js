/* FOR ONLY RUNNING HANDLE DOCS (NOT ASK ISI-LOKAL FOR NEW DOCS) */

(async () => {
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { mkdirSync, existsSync } = require('fs')
  const { handleQueue } = require('../jobs/handle-queue.js')
  const { VFK_COUNTY } = require('../config.js')

  // Set up logging
  logConfig({
    prefix: 'queueDocuments',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('queue-docments')
  })

  // Make sure directories are setup correct
  const syncDir = (dir) => {
    if (!existsSync(dir)) {
      logger('info', [`${dir} folder does not exist, creating...`])
      mkdirSync(dir)
    }
  }

  /* ------- VESTFOLD ------- */
  // Setup document-dirs for Vestfold
  syncDir('./documents')
  syncDir(`./documents/${VFK_COUNTY.NAME}`)
  syncDir(`./documents/${VFK_COUNTY.NAME}/queue`)
  syncDir(`./documents/${VFK_COUNTY.NAME}/failed`)
  syncDir(`./documents/${VFK_COUNTY.NAME}/finished`)

  // Handle queue for Vestfold
  try {
    const queueResult = await handleQueue(VFK_COUNTY)
    logConfig({
      prefix: 'queueAndHandleReadyDocuments' // Reset prefix
    })
    logger('info', [`Handled documents from ${VFK_COUNTY.NAME} queue, result: handledDocs ${queueResult.handledDocs}, skippedDocs: ${queueResult.skippedDocs}, unhandledErrors: ${queueResult.unhandledErrors}`])
  } catch (error) {
    logger('error', [`Failed when queueing ready documents for countyNumber: ${VFK_COUNTY.NAME}`, 'error', error.response?.data || error.stack || error.toString()])
  }
})()
