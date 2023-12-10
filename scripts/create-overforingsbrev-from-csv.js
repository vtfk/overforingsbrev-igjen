(async () => {
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { mkdirSync, existsSync, writeFileSync } = require('fs')
  const { TFK_COUNTY, VFK_COUNTY } = require('../config.js')
  const csv = require('csvtojson')

  /* -------- MANUAL CONFIG HERE -------- */
  const VFK_ENABLED = true
  const VFK_CSV_PATH = 'C:/tempBackups/overforingsbrevliste/AnsattlisteTEST.csv'

  const TFK_ENABLED = false
  const TFK_CSV_PATH = 'csvpath'
  /* -------- END MANUAL CONFIG -------- */

  const syncDir = (dir) => {
    if (!existsSync(dir)) {
      logger('info', [`${dir} folder does not exist, creating...`])
      mkdirSync(dir)
    }
  }
  const overforingsbrevFromCsv = async (county, csvFilePath) => {
    // Make sure directories are setup correct
    syncDir('./documents')
    syncDir(`./documents/${county.NAME}`)
    syncDir(`./documents/${county.NAME}/overforingsbrev`)
    syncDir(`./documents/${county.NAME}/overforingsbrev/invalidRows`)

    const employees = await csv({ delimiter: ';' }).fromFile(csvFilePath, { encoding: 'utf-8' })
    let index = 0
    const result = {
      success: 0,
      problems: 0
    }
    for (const employee of employees) {
      index++
      if (!employee['11 siffer']) {
        logger('warn', ['Missing "11 siffer" row, adding to invalidRows dir'])
        writeFileSync(`./documents/${county.NAME}/overforingsbrev/invalidRows/${index}.json`, JSON.stringify(employee, null, 2))
        result.problems++
        continue
      }
      if (employee['11 siffer'].trim().length !== 11) {
        logger('warn', ['"11 siffer" row did not contain 11 digits! Adding to invalidRows dir'])
        writeFileSync(`./documents/${county.NAME}/overforingsbrev/invalidRows/${index}.json`, JSON.stringify(employee, null, 2))
        result.problems++
        continue
      }
      if (!employee['Navn']) {
        logger('warn', ['Missing "Navn" row, adding to invalidRows dir'])
        writeFileSync(`./documents/${county.NAME}/overforingsbrev/invalidRows/${index}.json`, JSON.stringify(employee, null, 2))
        result.problems++
        continue
      }
      const overforingsbrevInfo = {
        ssn: employee['11 siffer'].trim(),
        name: employee['Navn'],
        shortName: employee['Kortnavn']
      }
      const documentId = `${overforingsbrevInfo.name.replaceAll(' ', '')}-${index}`
      writeFileSync(`./documents/${county.NAME}/overforingsbrev/OVERFORINGSBREV_${documentId}.json`, JSON.stringify(overforingsbrevInfo, null, 2))
      result.success++
    }
    return result
  }

  // Set up logging
  logConfig({
    prefix: 'createOverforingsbrevFromCsv',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('create-overforingsbrev-from-csv')
  })

  if (VFK_ENABLED) {
    const result = await overforingsbrevFromCsv(VFK_COUNTY, VFK_CSV_PATH)
    logger('info', ['Finished converting from csv for Vestfold', 'Result', `Success: ${result.success}. Problems: ${result.problems}`])
  }

  if (TFK_ENABLED) {
    const result = await overforingsbrevFromCsv(TFK_COUNTY, TFK_CSV_PATH)
    logger('info', ['Finished converting from csv for Telemark', 'Result', `Success: ${result.success}. Problems: ${result.problems}`])
  }
})()
