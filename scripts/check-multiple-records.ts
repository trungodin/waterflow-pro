import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMultipleRecords() {
    const target = '02133625821';
    console.log(`🔍 Checking for multiple records with danh_bo: ${target}\n`);

    // Get ALL records for this danh_bo
    const { data, error } = await supabase
        .from('water_lock_status')
        .select('*')
        .eq('danh_bo', target)
        .order('id_tb', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ No records found!');
        return;
    }

    console.log(`✅ Found ${data.length} record(s):\n`);
    data.forEach((record, index) => {
        console.log(`Record ${index + 1} (${index === 0 ? 'LATEST' : 'older'}):`);
        console.log({
            id_tb: record.id_tb,
            danh_bo: record.danh_bo,
            tinh_trang: record.tinh_trang,
            ngay_khoa: record.ngay_khoa,
            ngay_mo: record.ngay_mo
        });
        console.log('');
    });
}

checkMultipleRecords().catch(console.error);
