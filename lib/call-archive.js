const { VFK_COUNTY, TFK_COUNTY, VFK_ARCHIVE, TFK_ARCHIVE } = require('../config')
const { getMsalToken } = require('./get-msal-token')
const axios = require('./axios-instance').getAxiosInstance()

module.exports.callArchive = async (endpoint, payload, county) => {
  if (!endpoint) throw new Error('Missing required parameter "endpoint"')
  if (!payload) throw new Error('Missing required parameter "payload"')
  if (!county) throw new Error('Missing required parameter "county"')

  /*
  const { data } = await axios.post(`${VTFK_ARCHIVE.URL}/${endpoint}`, payload, { headers: { 'Ocp-Apim-Subscription-Key': VTFK_ARCHIVE.KEY } })
  return data
  */

  if (county.NAME === VFK_COUNTY.NAME) { // Vestfold
    const authConfig = {
      countyName: VFK_COUNTY.NAME,
      clientId: VFK_ARCHIVE.CLIENT_ID,
      tenantId: VFK_ARCHIVE.TENANT_ID,
      clientSecret: VFK_ARCHIVE.CLIENT_SECRET,
      scope: VFK_ARCHIVE.SCOPE
    }
    const accessToken = await getMsalToken(authConfig)
    const { data } = await axios.post(`${VFK_ARCHIVE.URL}/${endpoint}`, payload, { headers: { Authorization: `Bearer ${accessToken}` } })
    return data
  } else if ((county.NAME === TFK_COUNTY.NAME)) { // Telemark
    const authConfig = {
      countyName: TFK_COUNTY.NAME,
      clientId: TFK_ARCHIVE.CLIENT_ID,
      tenantId: TFK_ARCHIVE.TENANT_ID,
      clientSecret: TFK_ARCHIVE.CLIENT_SECRET,
      scope: TFK_ARCHIVE.SCOPE
    }
    const accessToken = await getMsalToken(authConfig)
    const { data } = await axios.post(`${TFK_ARCHIVE.URL}/${endpoint}`, payload, { headers: { Authorization: `Bearer ${accessToken}` } })
    return data
  }
}
