import { getOnOffSheetDataForMigration } from '../lib/data-service';

async function checkDanhBo() {
    console.log('🔍 Fetching ON_OFF data from Google Sheets...\n');
    
    const data = await getOnOffSheetDataForMigration();
    console.log(`📊 Total records: ${data.length}\n`);

    const targetDanhBo = '02133625821';
    console.log(`🔎 Searching for: ${targetDanhBo}\n`);

    // Search with exact match
    const exact = data.filter((d: any) => d.DanhBa === targetDanhBo);
    
    // Search without leading zeros
    const withoutZeros = data.filter((d: any) => 
        String(d.DanhBa).replace(/^0+/, '') === targetDanhBo.replace(/^0+/, '')
    );

    // Search with padding
    const padded = data.filter((d: any) => 
        String(d.DanhBa).padStart(11, '0') === targetDanhBo
    );

    if (exact.length > 0) {
        console.log(`✅ Found exact match (${exact.length}):`);
        exact.forEach((d: any) => console.log(d));
    } else if (withoutZeros.length > 0) {
        console.log(`✅ Found without leading zeros (${withoutZeros.length}):`);
        withoutZeros.forEach((d: any) => console.log(d));
    } else if (padded.length > 0) {
        console.log(`✅ Found with padding (${padded.length}):`);
        padded.forEach((d: any) => console.log(d));
    } else {
        console.log('❌ NOT FOUND in any format!');
    }

    // Show samples
    console.log('\n📋 Sample records (first 5):');
    data.slice(0, 5).forEach((d: any) => {
        console.log({
            IdTB: d.IdTB,
            DanhBa: d.DanhBa,
            TinhTrang: d.TinhTrang
        });
    });
}

checkDanhBo().catch(console.error);
