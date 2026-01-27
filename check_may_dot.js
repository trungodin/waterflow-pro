
const { executeSqlQuery } = require('./lib/soap');

async function checkMayDotRelationship() {
  const query = `
    SELECT 
      [May], 
      [Dot], 
      COUNT(*) as Count
    FROM [DocSo] 
    WHERE [May] IS NOT NULL 
    GROUP BY [May], [Dot] 
    ORDER BY [May], [Dot]
  `;
  
  try {
    const result = await executeSqlQuery('f_Select_SQL_Doc_so', query);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  }
}

checkMayDotRelationship();
