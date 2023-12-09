/**
 * @typedef {Object} County
 * @property {string} COUNTY_NUMBER
 * @property {string} NAME
 * @property {string} DISPLAY_NAME
 * @property {string} CEO_NAME
*/

/**
 * @typedef {Object} FlowJob
 * @property {Object} result
 * @property {boolean} jobFinished
 * @property {boolean} finishedTimestamp
 * @property {Object} error
 */

/**
 * @typedef {Object} FlowStatus
 * @property {string} documentName
 * @property {string} documentPath
 * @property {string} documentType
 * @property {string} documentId
 * @property {County} county
 * @property {string} createdTimestamp // ISOstring
 * @property {string} finishedTimestamp // ISOstring
 * @property {boolean} finished
 * @property {boolean} failed
 * @property {boolean} wait
 * @property {number} runs
 * @property {string} nextRun //ISOstring
 * @property {FlowJob} [syncPrivatePerson]
 * @property {FlowJob} [syncProject]
 * @property {FlowJob} [syncCase]
 * @property {FlowJob} [generatePdf]
 * @property {FlowJob} [archive]
 * @property {FlowJob} [dispatchDocument]
 * @property {FlowJob} [closeCase]
 * @property {FlowJob} [stats]
 */

/**
 * @typedef {Object} DocumentData
 * @property {FlowStatus} flowStatus
 * @property {string} ssn
 * @property {string} upn
 * @property {string} fylke
 *
 */

exports.unused = {}
