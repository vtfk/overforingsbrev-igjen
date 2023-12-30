(async () => {
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger.js')
  const { mkdirSync, existsSync, writeFileSync } = require('fs')
  const { TFK_COUNTY, VFK_COUNTY } = require('../config.js')
  const csv = require('csvtojson')
  const validator = require('@navikt/fnrvalidator')

  /* -------- MANUAL CONFIG HERE -------- */
  const VFK_ENABLED = true
  const VFK_CSV_PATH = '/Users/jorgenthorsnes/temp-backup/ansattlister/test/vestfold-test.csv'

  const TFK_ENABLED = false
  const TFK_CSV_PATH = 'C:/tempBackups/privatepersonsliste/Telemark ansatte oversendelsesbrevNY.csv'
  /* -------- END MANUAL CONFIG -------- */

  const syncDir = (dir) => {
    if (!existsSync(dir)) {
      logger('info', [`${dir} folder does not exist, creating...`])
      mkdirSync(dir)
    }
  }

  const validateFnr = (fnr) => {
    if (!fnr) {
      logger('warn', ['Missing "Fødselsnr" row, adding to invalidRows dir'])
      return { valid: false, ssn: null, type: null, reasons: [] }
    }
    if (typeof fnr !== 'string') {
      logger('warn', ['"Fødselsnr" is not string, adding to invalidRows dir'])
      return { valid: false, ssn: null, type: null, reasons: [] }
    }
    if (fnr.includes('.')) fnr = fnr.replaceAll('.', '')

    if (fnr.length !== 11) {
      logger('warn', ['"Fødselsnr" is not length 11, adding to invalidRows dir'])
      return { valid: false, ssn: fnr, type: null, reasons: [] }
    }

    const fnrCheck = validator.fnr(fnr)


    if (fnrCheck.status === 'invalid') {
      logger('warn', ['"Fødselsnr" is not valid, adding to invalidRows dir'])
      return { valid: false, ssn: fnr, type: null, reasons: fnrCheck.reasons }
    }
    if (fnrCheck.status = 'valid') {
      return { valid: true, ssn: fnr, type: fnrCheck.type, reasons: [] }
    }
    throw new Error('what')
  }

  const privatepersonsFromCsv = async (county, csvFilePath) => {
    // Make sure directories are setup correct
    syncDir('./documents')
    syncDir(`./documents/${county.NAME}`)
    syncDir(`./documents/${county.NAME}/privatepersons`)
    syncDir(`./documents/${county.NAME}/privatepersons/invalidRows`)
    syncDir(`./documents/${county.NAME}/privatepersons/duplicates`)

    const employees = await csv({ delimiter: ';' }).fromFile(csvFilePath, { encoding: 'utf-8' })
    let index = 0
    const result = {
      success: 0,
      problems: 0,
      duplicates: 0
    }

    const fnrs = []

    for (const employee of employees) {
      index++
      const { ssn, valid, type, reasons } = validateFnr(employee['Fødselsnr'])
      
      if (fnrs.includes(ssn)) {
        logger('warn', [`${ssn} is already handled - moving to duplicates`])
        writeFileSync(`./documents/${county.NAME}/privatepersons/duplicates/${index}.json`, JSON.stringify({ employee, ssn, valid, type, reasons }, null, 2))
        result.duplicates++
        continue
      }

      if (!valid) {
        writeFileSync(`./documents/${county.NAME}/privatepersons/invalidRows/${index}.json`, JSON.stringify({ employee, ssn, valid, type, reasons }, null, 2))
        result.problems++
        continue
      }
      if (!employee['Navn']) {
        logger('warn', ['Missing "Navn" row, adding to invalidRows dir'])
        writeFileSync(`./documents/${county.NAME}/privatepersons/invalidRows/${index}.json`, JSON.stringify({ employee, ssn, valid, type, reasons }, null, 2))
        result.problems++
        continue
      }
      const privatepersonsInfo = {
        ssn,
        name: employee['Navn']
      }
      
      const documentId = `${privatepersonsInfo.name.replaceAll(' ', '')}-${index}`
      writeFileSync(`./documents/${county.NAME}/privatepersons/PRIVATEPERSON_${documentId}.json`, JSON.stringify(privatepersonsInfo, null, 2))
      fnrs.push(ssn)
      result.success++
    }
    return result
  }

  // Set up logging
  logConfig({
    prefix: 'createprivatepersonsFromCsv',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('create-privatepersons-from-csv')
  })

  if (VFK_ENABLED) {
    const result = await privatepersonsFromCsv(VFK_COUNTY, VFK_CSV_PATH)
    logger('info', ['Finished converting from csv for Vestfold', 'Result', `Success: ${result.success}. Duplicates: ${result.duplicates}. Problems: ${result.problems}`])
  }

  if (TFK_ENABLED) {
    const result = await privatepersonsFromCsv(TFK_COUNTY, TFK_CSV_PATH)
    logger('info', ['Finished converting from csv for Telemark', 'Result', `Success: ${result.success}. Duplicates: ${result.duplicates}. Problems: ${result.problems}`])
  }
})()
