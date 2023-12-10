const { RETRY_INTERVALS_MINUTES } = require('../config')
const { logger } = require('@vtfk/logger')
const { renameSync, writeFileSync, existsSync, unlinkSync } = require('fs')
const { archive } = require('./archive')
const { stats } = require('./stats')
const { syncPrivatePerson } = require('./sync-private-person')
const { syncProject } = require('./sync-project')
const { syncCase } = require('./sync-case')
const { dispatchDocument } = require('./dispatch-document')
const { closeCase } = require('./close-case')
const { generatePdf } = require('./generate-pdf')
const { sendEmail } = require('./send-email')

const handleWait = (jobName, documentData) => {
  try {
    // Lagre hele documentData oppå seg selv i queue
    documentData.flowStatus.wait = true
    writeFileSync(documentData.flowStatus.documentPath, JSON.stringify(documentData, null, 2))
  } catch (error) {
    logger('error', ['Dritt og møkk... vi fikk ikke lagret flowStatus til queuefolder. Ting vil potensielt bli kjørt dobbelt opp', `jobben den stoppet på: ${jobName}`, 'Error', error.stack || error.toString()])
  }
}

const shouldRunJob = (jobName, documentData, flowDefinition) => {
  if (documentData.flowStatus.failed) return false
  if (documentData.flowStatus.wait) return false
  if (jobName === 'fail') return true // Used when testing
  if (jobName === 'finishDocument') return true // If not failed and not waiting, we can run finishDocument (it is ran last)
  if (!flowDefinition[jobName]?.enabled) return false
  if (documentData.flowStatus[jobName]?.jobFinished) return false
  if (flowDefinition[jobName].runCondition) {
    if (!flowDefinition[jobName].runCondition(documentData)) {
      logger('info', ['shouldRunJob', `RunCondition for ${jobName} was not satisfied - skipping job`])
      return false
    } else {
      logger('info', ['shouldRunJob', `RunCondition for ${jobName} was satisfied - job can be run`])
    }
  }
  if (flowDefinition[jobName].timerCondition) {
    if (!flowDefinition[jobName].timerCondition(documentData)) {
      logger('info', ['shouldRunJob', `TimerCondition for ${jobName} was not satisfied - waiting until next run`])
      handleWait(jobName, documentData)
      return false
    } else {
      logger('info', ['shouldRunJob', `TimerCondition for ${jobName} was satisfied - job can be run`])
    }
  }
  return true
}

/* Retries forklart

flowStatus.runs er antall ganger flowen HAR kjørt. Den inkrementeres hver gang et nytt forsøk er gjort
RETRY_INTERVALS_MINUTES er en liste med hvor mange ganger vi skal prøve på nytt. Altså hvis lista er 3 lang, så skal vi totalt kjøre 4 ganger
For å slippe plusser og minuser legger vi derfor til et element først i RETRY_INTERVALS_MINUTES for å representere den første kjøringen (i config.js)
Første kjøring er kjøring 1 - men runs inkrementeres ikke før vi er ferdige å prøve kjøringen.
Feilhåndteringen får så vite hvor mange ganger jobben er kjørt, og kan bruke flowStatus.runs som index for å sjekke hvor lenge vi skal vente til neste kjøring. Om (flowStatus.runs >= RETRY_INTERVALS_MINUTES.length), så skal vi ikke prøve mer, og kan gi error-beskjed

*/
const handleFailedJob = async (jobName, documentData, error) => {
  documentData.flowStatus.runs++
  const errorMsg = error.response?.data || error.stack || error.toString()
  documentData.flowStatus[jobName].error = errorMsg
  if (documentData.flowStatus.runs >= RETRY_INTERVALS_MINUTES.length) {
    try {
      logger('error', ['Document needs care and love', `Failed in job ${jobName}`, `Runs: ${documentData.flowStatus.runs}/${RETRY_INTERVALS_MINUTES.length}. Will not run again. Reset flowStatus.runs and move back to queue to try again`, 'error:', errorMsg])
      // Flytt filen til error folder
      writeFileSync(documentData.flowStatus.documentPath, JSON.stringify(documentData, null, 2))
      renameSync(documentData.flowStatus.documentPath, `./documents/${documentData.flowStatus.county.NAME}/failed/${documentData.flowStatus.documentName}.json`)
    } catch (error) {
      logger('error', ['Dritt og møkk... vi fikk ikke lagret dokumentet til failedfolder. Ting vil potensielt bli kjørt dobbelt opp', `jobben den stoppet på: ${jobName}`, 'Error', error.stack || error.toString()])
    }
    return // Stop here
  }
  const minutesToWait = RETRY_INTERVALS_MINUTES[documentData.flowStatus.runs]
  const now = new Date()
  documentData.flowStatus.nextRun = new Date(now.setMinutes(now.getMinutes() + minutesToWait)).toISOString()
  try {
    logger('warn', [`Failed in job ${jobName}`, `Runs: ${documentData.flowStatus.runs}/${RETRY_INTERVALS_MINUTES.length}. Will retry in ${minutesToWait} minutes`, 'error:', errorMsg])
    // Lagre hele documentData oppå seg selv i queue
    writeFileSync(documentData.flowStatus.documentPath, JSON.stringify(documentData, null, 2))
  } catch (error) {
    logger('error', ['Dritt og møkk... vi fikk ikke lagret flowStatus til queuefolder. Ting vil potensielt bli kjørt dobbelt opp', `jobben den stoppet på: ${jobName}`, 'Error', error.stack || error.toString()])
  }
}

const finishDocument = (documentData) => {
  logger('info', ['finishDocument', 'All jobs finished, cleaning up and moving from queue to finished'])
  documentData.flowStatus.finished = true
  documentData.flowStatus.finishedTimestamp = new Date().toISOString()
  writeFileSync(`./documents/${documentData.flowStatus.county.NAME}/finished/${documentData.flowStatus.documentName}.json`, JSON.stringify(documentData, null, 2))
  logger('info', ['finishDocument', 'Successfully created document in finished dir, deleting original from queue (if it exists)'])
  if (existsSync(documentData.flowStatus.documentPath)) unlinkSync(documentData.flowStatus.documentPath)
  logger('info', ['finishDocument', 'Successfully deleted document from queue, all is good :)'])
}

/**
 *
 * @param {Object} documentData
 * @param {Object} documentData.flowStatus
 * @param {string} document.flowStatus.nextRun // dateISOstring
 *
 * @param {Object} flowDefinition // flow for the document, must be a flow from the ./flows directory
 */
const handleDocument = async (documentData, flowDefinition) => {
  documentData.flowStatus.failed = false // New run, we are optimistic and reset failed
  documentData.flowStatus.wait = false // New run, we are optimistic and reset wait
  {
    const jobNamePrefix = 'syncPrivatePerson'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await syncPrivatePerson(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'syncProject'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await syncProject(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'syncCase'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await syncCase(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'generatePdf'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await generatePdf(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'archive'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await archive(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'dispatchDocument'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await dispatchDocument(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'closeCase'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await closeCase(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'sendEmail'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await sendEmail(documentData, flowDefinition[jobName])
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobNamePrefix = 'stats'
    const matchingJobNames = Object.keys(flowDefinition).filter(prop => prop.startsWith(jobNamePrefix))
    for (const jobName of matchingJobNames) {
      if (shouldRunJob(jobName, documentData, flowDefinition)) {
        if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
        try {
          const result = await stats(documentData, flowDefinition[jobName], flowDefinition)
          documentData.flowStatus[jobName].result = result
          documentData.flowStatus[jobName].jobFinished = true
          documentData.flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        } catch (error) {
          documentData.flowStatus.failed = true
          handleFailedJob(jobName, documentData, error)
        }
      }
    }
  }
  {
    const jobName = 'finishDocument'
    if (shouldRunJob(jobName, documentData)) { // Runs regardless of flowdefinition
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await finishDocument(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  return { wait: documentData.flowStatus.wait }
}

module.exports = { handleDocument }
