import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLockStatus() {
    console.log('🔍 Checking water_lock_status table...\n');

    // 1. Count total records
    const { count, error: countError } = await supabase
        .from('water_lock_status')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting records:', countError);
        return;
    }

    console.log(`📊 Total records in water_lock_status: ${count}\n`);

    if (count === 0) {
        console.log('⚠️  No data found! You need to run migration script first.');
        console.log('   Run: npm run migrate:sheets\n');
        return;
    }

    // 2. Sample some records
    const { data: samples, error: sampleError } = await supabase
        .from('water_lock_status')
        .select('danh_bo, tinh_trang, ngay_khoa, ngay_mo, kieu_khoa, nhom_khoa')
        .limit(5);

    if (sampleError) {
        console.error('❌ Error fetching samples:', sampleError);
        return;
    }

    console.log('📋 Sample records:');
    console.table(samples);

    // 3. Check specific danhba from the screenshot (02133625821)
    const testDanhba = '02133625821';
    console.log(`\n🔎 Checking specific danhba: ${testDanhba}`);
    
    const { data: specific, error: specificError } = await supabase
        .from('water_lock_status')
        .select('*')
        .eq('danh_bo', testDanhba)
        .maybeSingle();

    if (specificError) {
        console.error('❌ Error:', specificError);
    } else if (!specific) {
        console.log('⚠️  Not found in database');
    } else {
        console.log('✅ Found:');
        console.log(specific);
    }

    // 4. Count by status
    const { data: statusCounts, error: statusError } = await supabase
        .from('water_lock_status')
        .select('tinh_trang')
        .not('tinh_trang', 'is', null);

    if (!statusError && statusCounts) {
        const counts = statusCounts.reduce((acc: any, row: any) => {
            acc[row.tinh_trang] = (acc[row.tinh_trang] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📈 Status distribution:');
        console.table(counts);
    }
}

checkLockStatus().catch(console.error);
