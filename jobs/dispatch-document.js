const { callArchive } = require('../lib/call-archive')
const { logger } = require('@vtfk/logger')

const invalidAddressCheck = (privatePerson) => {
  let invalidAddress = false
  let invalidAddressMsg = 'Dokumentet kunne ikke sendes på SvarUT, og må sjekkes manuelt før utsending. '
  if (privatePerson.addressCode !== null && privatePerson.addressCode !== undefined && privatePerson.addressCode !== 0) { // Have addresscode (can be removed after 1.1.24)
    invalidAddress = true
    invalidAddressMsg += 'Mottaker er ikke vanlig bosatt (har adressesperrre eller klientadresse).'
    return { invalidAddress, invalidAddressMsg }
  } else if (privatePerson.zipCode.length !== 4 || privatePerson.zipCode === '9999') {
    invalidAddress = true
    invalidAddressMsg += 'Mottakers postnummer er ikke et gyldig norsk postnummer.'
    return { invalidAddress, invalidAddressMsg }
  } else if (privatePerson.streetAddress === 'Ukjent adresse') {
    invalidAddress = true
    invalidAddressMsg += 'Mottakers adresse er "Ukjent adresse"'
    return { invalidAddress, invalidAddressMsg }
  } else if (privatePerson.addressProtection) {
    invalidAddress = true
    invalidAddressMsg += 'Mottaker har adressebeskyttelse.'
    return { invalidAddress, invalidAddressMsg }
  }
  invalidAddressMsg = 'Adressen er gyldig'
  return { invalidAddress, invalidAddressMsg }
}

const dispatchDocument = async (documentData, jobDefinition) => {
  logger('info', ['dispatchDocument', 'Trying to dispatch document'])
  if (!jobDefinition.mapper) {
    throw new Error('Missing required mapper in dispatchDocumentJob')
  }

  const { recipientPrivatePerson, DocumentNumber } = jobDefinition.mapper(documentData)

  // Verify that we have what we need for proper dispatching
  if (!recipientPrivatePerson) throw new Error('Mapper in dispathDocumentJob must return "recipientPrivatePerson" object')
  if (!DocumentNumber) throw new Error('Mapper in dispathDocumentJob must return "DocumentNumber" to dispatch')
  if (!recipientPrivatePerson.streetAddress) throw new Error('Mapper in dispathDocumentJob must return "recipientPrivatePerson.streetAddress"')
  if (!recipientPrivatePerson.zipCode) throw new Error('Mapper in dispathDocumentJob must return "recipientPrivatePerson.zipCode"')
  if (typeof recipientPrivatePerson.addressProtection !== 'boolean' && typeof recipientPrivatePerson.addressCode !== 'number') throw new Error('Mapper in dispathDocumentJob must return "recipientPrivatePerson.zipCode"')

  const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(recipientPrivatePerson)

  if (invalidAddress) {
    logger('info', ['dispatchDocument', invalidAddressMsg, 'will not send on SvarUT, but update document with a note.'])
    const updateDocumentPayload = {
      service: 'DocumentService',
      method: 'UpdateDocument',
      parameter: {
        DocumentNumber,
        Remarks: [
          {
            Title: invalidAddressMsg,
            RemarkType: 'ME'
          }
        ]
      }
    }
    logger('info', ['dispatchDocument', 'Updating document in archive'])
    const archiveResponse = await callArchive('archive', updateDocumentPayload)
    logger('info', ['dispatchDocument', `Finished updating document ${archiveResponse.DocumentNumber} in archive, returning and finished`])
    return {
      invalidAddress,
      invalidAddressMsg,
      dispatchResponse: []
    }
  }

  logger('info', ['dispatchDocument', 'Address is ok, dispatching with SvarUT'])
  const dispatchPayload = {
    service: 'DocumentService',
    method: 'DispatchDocuments',
    parameter: {
      Documents: [
        {
          DocumentNumber
        }
      ]
    }
  }
  const dispatchResponse = await callArchive('archive', dispatchPayload)
  logger('info', ['dispatchDocument', 'Got response from dispatchDocuments, checking result'])
  if (!dispatchResponse[0].Successful) {
    throw new Error(`Dispatching of document ${DocumentNumber} was not successful! ErrorMessage: ${dispatchResponse[0].ErrorMessage}`)
  }
  logger('info', ['dispatchDocument', 'Successfully dispatched document on SvarUT'])

  return {
    invalidAddress,
    invalidAddressMsg,
    dispatchResponse
  }
}

module.exports = { dispatchDocument, invalidAddressCheck }
