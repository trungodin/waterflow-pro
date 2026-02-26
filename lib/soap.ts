import { XMLParser } from 'fast-xml-parser'
import { logger } from './logger'

const API_URL = process.env.SOAP_API_URL
const API_USER = process.env.SOAP_API_USER

if (!API_URL || !API_USER) {
  logger.warn('⚠️ SOAP_API_URL hoặc SOAP_API_USER chưa được cấu hình trong .env.local')
}

export async function executeSqlQuery(functionName: string, sqlQuery: string) {
  // Guard: Không thực thi nếu thiếu cấu hình SOAP
  if (!API_URL || !API_USER) {
    logger.error('executeSqlQuery: SOAP_API_URL hoặc SOAP_API_USER chưa được cấu hình.')
    return []
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
      <s:Body>
        <${functionName} xmlns="http://tempuri.org/">
          <m_sql>${escapeHtml(sqlQuery)}</m_sql>
          <m_function_name />
          <m_user>${API_USER}</m_user>
        </${functionName}>
      </s:Body>
    </s:Envelope>`

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://tempuri.org/${functionName}`,
      },
      body: soapBody,
      cache: 'no-store' // Ensure fresh data
    })

    if (!response.ok) {
      throw new Error(`SOAP API Error: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    })
    const result = parser.parse(text)

    // Navigate to NewDataSet -> Table1
    // Structure: Envelope -> Body -> Response -> Result -> diffgram -> NewDataSet -> Table1
    const body = result['soap:Envelope']?.['soap:Body'] || result['s:Envelope']?.['s:Body']
    const responseBody = body?.[`${functionName}Response`]
    const innerResult = responseBody?.[`${functionName}Result`]

    // The innerResult might be complex. Usually diffgram is present.
    // fast-xml-parser might handle nested namespaces diffculty. 
    // Let's look for 'NewDataSet' recursively or handle known path.

    const diffgram = innerResult?.['diffgr:diffgram']
    const newDataSet = diffgram?.['NewDataSet']

    if (!newDataSet) return []

    const table1 = newDataSet['Table1']

    if (!table1) return []

    // If only 1 row, it might be an object, not array. Normalize to array.
    return Array.isArray(table1) ? table1 : [table1]

  } catch (error) {
    logger.error('SOAP Execution Error:', error)
    return []
  }
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
