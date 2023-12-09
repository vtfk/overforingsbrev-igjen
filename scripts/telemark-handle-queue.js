/* FOR ONLY RUNNING HANDLE DOCS (NOT ASK ISI-LOKAL FOR NEW DOCS) */

(async () => {
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { mkdirSync, existsSync } = require('fs')
  const { handleQueue } = require('../jobs/handle-queue.js')
  const { TFK_COUNTY } = require('../config.js')

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

  /* ------- TELEMARK ------- */
  // Setup document-dirs for Telemark
  syncDir('./documents')
  syncDir(`./documents/${TFK_COUNTY.NAME}`)
  syncDir(`./documents/${TFK_COUNTY.NAME}/queue`)
  syncDir(`./documents/${TFK_COUNTY.NAME}/failed`)
  syncDir(`./documents/${TFK_COUNTY.NAME}/finished`)

  // Handle queue for Telemark
  try {
    const queueResult = await handleQueue(TFK_COUNTY)
    logConfig({
      prefix: 'queueAndHandleReadyDocuments' // Reset prefix
    })
    logger('info', [`Handled documents from ${TFK_COUNTY.NAME} queue, result: handledDocs ${queueResult.handledDocs}, skippedDocs: ${queueResult.skippedDocs}, unhandledErrors: ${queueResult.unhandledErrors}`])
  } catch (error) {
    logger('error', [`Failed when queueing ready documents for countyNumber: ${TFK_COUNTY.NAME}`, 'error', error.response?.data || error.stack || error.toString()])
  }
})()
