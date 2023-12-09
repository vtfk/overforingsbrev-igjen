const { invalidAddressCheck } = require('../jobs/dispatch-document')

const okAddress = {
  streetAddress: 'Gata 4',
  zipCode: '1234'
}

const invalidZipCode = {
  streetAddress: 'Gata 4',
  zipCode: '123'
}

const invalidZipCode2 = {
  streetAddress: 'Gata 4',
  zipCode: '12345'
}

const invalidZipCode3 = {
  streetAddress: 'Gata 4',
  zipCode: '9999'
}

const invalidStreetAddress = {
  streetAddress: 'Ukjent adresse',
  zipCode: '1234'
}

const hasAddressProtection = {
  streetAddress: 'En adresse',
  zipCode: '1234',
  addressProtection: true
}

const hasAddressCodeNotZero = {
  streetAddress: 'En adresse',
  zipCode: '1234',
  addressCode: 6
}

describe('InvalidAddressCheck returns correct data when', () => {
  test('Address is ok', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(okAddress)
    expect(invalidAddress).toBe(false)
    expect(invalidAddressMsg).toBe('Adressen er gyldig')
  })
  test('zipCode is 3 long', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(invalidZipCode)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Mottakers postnummer er ikke et gyldig norsk postnummer')
  })
  test('zipCode is 5 long', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(invalidZipCode2)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Mottakers postnummer er ikke et gyldig norsk postnummer')
  })
  test('zipCode is 9999', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(invalidZipCode3)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Mottakers postnummer er ikke et gyldig norsk postnummer')
  })
  test('streetAddress is "Ukjent adresse"', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(invalidStreetAddress)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Gyldig mottaker-addresse ble ikke funnet i folkeregisteret eller i VIGO.')
  })
  test('privatePerson has addressProtection', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(hasAddressProtection)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Mottaker har adressebeskyttelse')
  })
  test('privatePerson has addressCode and addressCode not zero', () => {
    const { invalidAddress, invalidAddressMsg } = invalidAddressCheck(hasAddressCodeNotZero)
    expect(invalidAddress).toBe(true)
    expect(invalidAddressMsg).toContain('Mottaker er ikke vanlig bosatt (har adressesperrre eller klientadresse)')
  })
})
