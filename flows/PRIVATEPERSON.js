/**
 * @typedef {Object} PRIVATEPERSON
 * @property {import('../lib/typedefs').FlowStatus} flowStatus
 * @property {string} ssn
 * @property {string} upn
 * @property {string} fylke
 *
*/

module.exports = {
  syncPrivatePerson: {
    enabled: true,
    /**
     * @param {PRIVATEPERSON} documentData
    */
    mapper: (documentData) => {
      return {
        ssn: documentData.ssn
      }
    }
  }
}
