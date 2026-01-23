import { API_CONFIG } from './config'
import { DOMParser } from '@xmldom/xmldom'

/**
 * Builds the SOAP request body for the SQL execution.
 */
function buildSoapRequest(functionName: string, sqlQuery: string): string {
  // Use a simpler string replacement to avoid heavy XML builder libraries for this specific structure
  // Escaping special XML characters is crucial
  
  const escapeXml = (unsafe: string) =>
    unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });

  return `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><${functionName} xmlns="http://tempuri.org/"><m_sql>${escapeXml(sqlQuery)}</m_sql><m_function_name /><m_user>${API_CONFIG.USER}</m_user></${functionName}></s:Body></s:Envelope>`
}

/**
 * Executes a SQL query via the SOAP API.
 */
async function executeSqlQuery(functionName: string, sqlQuery: string): Promise<string> {
  const soapBody = buildSoapRequest(functionName, sqlQuery)
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

  try {
    const response = await fetch(API_CONFIG.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"http://tempuri.org/${functionName}"`,
        'Host': API_CONFIG.URL.split('//')[1].split('/')[0],
        // Mimic Python requests headers just in case
        'User-Agent': 'python-requests/2.31.0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      body: soapBody,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`API Error ${response.status}: ${text}`)
    }

    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Parses the SOAP response XML into an array of objects (like a DataFrame).
 * Simplifies the complex XML structure from the .NET DataSet.
 */
function parseSoapResponse(xmlString: string): any[] {
  try {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml')
    
    // The data is typically inside <diffgr:diffgram><NewDataSet><Table1>...</Table1></NewDataSet></diffgr:diffgram>
    // We look for "Table1" nodes.
    const tables = doc.getElementsByTagName('Table1')
    
    const results: any[] = []
    
    for (let i = 0; i < tables.length; i++) {
      const row = tables[i]
      const rowData: any = {}
      
      // Iterate over child nodes (columns)
      if (row.childNodes) {
          for (let j = 0; j < row.childNodes.length; j++) {
              const node = row.childNodes[j] as Element // Cast to Element to access tagName/textContent
               // Skip text nodes (whitespace)
              if (node.nodeType === 1) { // Element node
                  rowData[node.tagName] = node.textContent
              }
          }
      }
      results.push(rowData)
    }
    
    return results
  } catch (e) {
    console.error("XML Parse Error:", e)
    return []
  }
}

/**
 * Fetches data as an array of objects using a SQL query.
 */
export async function fetchSql(functionName: string, sqlQuery: string): Promise<any[]> {
    try {
        const xmlResponse = await executeSqlQuery(functionName, sqlQuery)
        return parseSoapResponse(xmlResponse)
    } catch (e) {
        console.error("Fetch SQL Error:", e)
        return [] // Return empty array on error to prevent crashes
    }
}
