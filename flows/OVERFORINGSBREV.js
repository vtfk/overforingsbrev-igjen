/**
 * @typedef {Object} OVERFORINGSBREV
 * @property {import('../lib/typedefs').FlowStatus} flowStatus
 * @property {string} ssn
 * @property {string} upn
 * @property {string} fylke
 *
*/

const { NODE_ENV, EMAIL_INVALID_PROJECT, EMAIL_INVALID_ADDRESS } = require('../config')
const { invalidAddressCheck } = require('../jobs/dispatch-document')

module.exports = {
  syncPrivatePerson: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      return {
        ssn: documentData.ssn
      }
    }
  },
  syncProject: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    getProjectPayload: (documentData) => {
      return {
        service: 'ProjectService',
        method: 'GetProjects',
        parameter: {
          Title: 'Personaldokumentasjon%',
          ContactReferenceNumber: documentData.flowStatus.syncPrivatePerson.result.privatePerson.ssn,
          IncludeProjectContacts: true,
          StatusCode: 'Under utføring'
        }
      }
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const employeeName = `${documentData.flowStatus.syncPrivatePerson.result.privatePerson.firstName} ${documentData.flowStatus.syncPrivatePerson.result.privatePerson.lastName}`
      return {
        service: 'ProjectService',
        method: 'CreateProject',
        parameter: {
          Title: `Personaldokumentasjon - ${employeeName}`,
          AccessGroup: 'Alle',
          Contacts: [
            {
              Role: 'Kontakt',
              ReferenceNumber: documentData.flowStatus.syncPrivatePerson.result.privatePerson.ssn
            }
          ]
        }
      }
    }
  },
  syncCase: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    getCasePayload: (documentData) => {
      return {
        service: 'CaseService',
        method: 'GetCases',
        parameter: {
          ProjectNumber: documentData.flowStatus.syncProject.result.ProjectNumber,
          Title: `Overføring av arbeidsforhold til ${documentData.flowStatus.county.DISPLAY_NAME}`
        },
        options: {
          onlyOpenCases: true
        }
      }
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      return {
        service: 'CaseService',
        method: 'CreateCase',
        parameter: {
          Project: documentData.flowStatus.syncProject.result.ProjectNumber,
          Title: `Overføring av arbeidsforhold til ${documentData.flowStatus.county.DISPLAY_NAME}`,
          AccessCode: '13',
          Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
          CaseType: 'Personal',
          AccessGroup: 'Innplassering nye fylkeskommuner',
          ResponsibleEnterpriseRecno: NODE_ENV === 'production' ? 204229 : 237034, // Fylkesdirektør (test 237034) (prod 204229)
          SubArchive: 1, // Personal
          Contacts: [
            {
              Role: 'Sakspart',
              ReferenceNumber: documentData.flowStatus.syncPrivatePerson.result.privatePerson.ssn,
              IsUnofficial: true
            }
          ],
          ArchiveCodes: [
            {
              ArchiveCode: documentData.flowStatus.syncPrivatePerson.result.privatePerson.ssn,
              ArchiveType: 'FNR',
              IsManualText: true,
              Sort: 1
            },
            {
              ArchiveCode: '420',
              ArchiveType: 'FELLESKLASSE PRINSIPP',
              Sort: 2
            }
          ]
        }
      }
    }
  },
  generatePdf: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const now = new Date()
      const fancyDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`
      const privatePerson = documentData.flowStatus.syncPrivatePerson.result.privatePerson
      const employeeName = `${privatePerson.firstName} ${privatePerson.lastName}`
      const { invalidAddress } = invalidAddressCheck(privatePerson)
      return {
        system: 'hrmu',
        template: 'overforingsbrev',
        language: 'nb',
        type: '2',
        version: 'B',
        data: {
          preview: false,
          documentDate: fancyDate,
          countyName: documentData.flowStatus.county.DISPLAY_NAME,
          employeeName,
          streetAddress: invalidAddress ? '' : privatePerson.streetAddress,
          zipCode: invalidAddress ? '' : privatePerson.zipCode,
          zipPlace: invalidAddress ? '' : privatePerson.zipPlace,
          documentResponsible: 'Fylkesdirektør',
          sender: documentData.flowStatus.county.CEO_NAME
        }
      }
    }
  },
  archive: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const privatePerson = documentData.flowStatus.syncPrivatePerson.result.privatePerson
      return {
        service: 'DocumentService',
        method: 'CreateDocument',
        parameter: {
          AccessCode: '13',
          AccessGroup: 'Innplassering nye fylkeskommuner',
          Category: 'Dokument ut',
          CaseNumber: documentData.flowStatus.syncCase.result.CaseNumber,
          Contacts: [
            {
              ReferenceNumber: privatePerson.ssn,
              Role: 'Mottaker',
              IsUnofficial: true
            }
          ],
          DocumentDate: new Date().toISOString(),
          Files: [
            {
              Base64Data: documentData.flowStatus.generatePdf.result,
              Category: '1',
              Format: 'pdf',
              Status: 'F',
              Title: `Overføring av arbeidsforhold til ${documentData.flowStatus.county.DISPLAY_NAME}`,
              VersionFormat: 'A'
            }
          ],
          Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
          ResponsibleEnterpriseRecno: NODE_ENV === 'production' ? 204229 : 237034, // Fylkesdirektør (test 237034) (prod 204229)
          Status: 'R',
          Title: `Overføring av arbeidsforhold til ${documentData.flowStatus.county.DISPLAY_NAME}`,
          UnofficialTitle: `Overføring av arbeidsforhold til ${documentData.flowStatus.county.DISPLAY_NAME}`,
          Archive: 'Saksdokument'
        }
      }
    }
  },
  dispatchDocument: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const privatePerson = documentData.flowStatus.syncPrivatePerson.result.privatePerson
      return {
        DocumentNumber: documentData.flowStatus.archive.result.DocumentNumber,
        recipientPrivatePerson: privatePerson
      }
    }
  },
  closeCase: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    runCondition: (documentData) => {
      const invalidAddress = documentData.flowStatus.dispatchDocument.result.invalidAddress
      return !invalidAddress // Do not close case if address is invalid, handled manually
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    timerCondition: (documentData) => {
      const finishedDispatchTime = new Date(documentData.flowStatus.dispatchDocument.finishedTimestamp)
      const minutesToWait = 10
      const timeWeCanRun = new Date(finishedDispatchTime.setMinutes(finishedDispatchTime.getMinutes() + minutesToWait))
      if (new Date() > timeWeCanRun) return true // 10 minutes or more since dispatchDocument finished
      return false // Less than 10 minutes since dispatchDocument ran, we have to wait
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      return {
        CaseNumber: documentData.flowStatus.syncCase.result.CaseNumber
      }
    }
  },
  sendEmailMissingManagerFromProject: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    runCondition: (documentData) => {
      const projectCreated = documentData.flowStatus.syncProject.result.projectCreated
      return projectCreated // If not created, we do not send
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const mailBody = `Hei, kjære arkivarer!<br><br>Jeg har akkurat opprettet et personalprosjekt, siden jeg ikke fant et på ansatt fra før av. MEN, jeg klarte ikke finne ut hvem som skulle stå som ansvarlig på prosjektet... 😞
      <br>Kunne dere ha hjulpet meg med å finne og sette korrekt ansvarlig person (leder) på dette personalprosjektet: <strong>${documentData.flowStatus.syncProject.result.ProjectNumber}</strong>?
      <br><br>Tusen takk på forhånd, og ha en fin dag! 😁`
      return {
        to: EMAIL_INVALID_PROJECT,
        from: 'noreply@vtfk.no',
        subject: 'Opprettet personalprosjekt, men mangler leder som ansvarlig person',
        template: {
          templateName: 'vtfk',
          templateData: {
            body: mailBody,
            signature: {
              name: 'Arkiveringsroboten',
              title: 'Robot',
              company: 'Robotavdelingen'
            }
          }
        }
      }
    }
  },
  sendEmailInvalidAddress: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    runCondition: (documentData) => {
      const invalidAddress = documentData.flowStatus.dispatchDocument.result.invalidAddress
      return invalidAddress // If not invalidAddress, do not send
    },
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      const mailBody = `Hei, arkivgenier!<br><br>Jeg har akkurat opprettet et "Overføringsbrev til ny fylkeskommune" i VTFK-arkivet. MEN, jeg turte ikke sende dokumentet på SvarUT siden mottaker enten hadde ugyldig adresse eller adressebeskyttelse 😞
      <br>Kunne dere ha hjulpet meg med å sjekke mottakers adresse, og sende dokumentet til mottaker manuelt, slik at det ikke skjer no dumt her?
      <br>Dokumentnummer: <strong>${documentData.flowStatus.archive.result.DocumentNumber}</strong>
      <br>Saken kan lukkes når brevet er sendt.
      <br><br>PS. Jeg har lagt en merknad på dokumentet om hva som var galt med mottakers adresse.
      <br><br>Tusen takk på forhånd, og ha en fin dag! 😁`
      return {
        to: EMAIL_INVALID_ADDRESS,
        from: 'noreply@vtfk.no',
        subject: 'Trenger hjelp med å sende ut overføringsbrev på SvarUT grunnet mottakers adresse',
        template: {
          templateName: 'vtfk',
          templateData: {
            body: mailBody,
            signature: {
              name: 'Arkiveringsroboten',
              title: 'Robot',
              company: 'Robotavdelingen'
            }
          }
        }
      }
    }
  },
  stats: {
    enabled: true,
    /**
     * @param {OVERFORINGSBREV} documentData
    */
    mapper: (documentData) => {
      return {
        company: 'FD', // Required. Sector
        description: 'Automatisk oppretting, arkivering, og utsending av et overføringsbrev for en ansatt', // Required. A description of what the statistic element represents
        type: documentData.flowStatus.documentType, // Required. A short searchable type-name that distinguishes the statistic element
        PrivatePersonRecno: documentData.flowStatus.syncPrivatePerson.result.privatePerson.recno,
        ProjectNumber: documentData.flowStatus.syncProject.result.ProjectNumber,
        CaseNumber: documentData.flowStatus.syncCase.result.CaseNumber,
        DocumentNumber: documentData.flowStatus.archive.result.DocumentNumber
      }
    }
  }
}
