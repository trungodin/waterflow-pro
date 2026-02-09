import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchDanhBo() {
    const target = '02133625821';
    console.log(`🔍 Searching for danh_bo similar to: ${target}\n`);

    // Try exact match
    const { data: exact, error: e1 } = await supabase
        .from('water_lock_status')
        .select('*')
        .eq('danh_bo', target)
        .maybeSingle();

    if (exact) {
        console.log('✅ Found exact match:');
        console.log(exact);
        return;
    }

    // Try without leading zero
    const alt1 = '2133625821';
    const { data: d1, error: e2 } = await supabase
        .from('water_lock_status')
        .select('*')
        .eq('danh_bo', alt1)
        .maybeSingle();

    if (d1) {
        console.log(`✅ Found with format "${alt1}":`);
        console.log(d1);
        return;
    }

    // Try LIKE search
    const { data: like, error: e3 } = await supabase
        .from('water_lock_status')
        .select('*')
        .like('danh_bo', '%2133625821%')
        .limit(10);

    if (like && like.length > 0) {
        console.log(`✅ Found ${like.length} similar records:`);
        like.forEach(d => console.log({
            danh_bo: d.danh_bo,
            tinh_trang: d.tinh_trang,
            ngay_khoa: d.ngay_khoa
        }));
        return;
    }

    console.log('❌ NOT FOUND in any format!');
    
    // Check assigned_customers table instead
    console.log('\n🔎 Checking assigned_customers table...');
    const { data: customer, error: e4 } = await supabase
        .from('assigned_customers')
        .select('*')
        .eq('danh_bo', target)
        .maybeSingle();

    if (customer) {
        console.log('✅ Found in assigned_customers:');
        console.log(customer);
        console.log('\n⚠️  This customer exists but has NO lock status record!');
        console.log('   This is why it shows "Bình thường" (default).');
    } else {
        console.log('❌ Not found in assigned_customers either!');
    }
}

searchDanhBo().catch(console.error);
