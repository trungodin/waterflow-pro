import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRefIdDuplicates() {
    console.log('🔍 Checking for duplicate ref_id in assigned_customers...\n');

    const { data, error } = await supabase
        .from('assigned_customers')
        .select('ref_id')
        .not('ref_id', 'is', null);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📊 Total records with ref_id: ${data.length}\n`);

    // Count duplicates
    const refIdCounts = new Map<string, number>();
    data.forEach((row: any) => {
        const count = refIdCounts.get(row.ref_id) || 0;
        refIdCounts.set(row.ref_id, count + 1);
    });

    const duplicates = Array.from(refIdCounts.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]); // Sort by count descending

    if (duplicates.length === 0) {
        console.log('✅ No duplicates found! ref_id can be made UNIQUE.');
        console.log('\n📋 Next steps:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run the migration file: supabase/migration_fix_fk.sql');
        return;
    }

    console.log(`❌ Found ${duplicates.length} duplicate ref_id values!\n`);
    console.log('Top 10 duplicates:');
    console.table(duplicates.slice(0, 10).map(([ref_id, count]) => ({ ref_id, count })));

    console.log('\n⚠️  Cannot add UNIQUE constraint with duplicates!');
    console.log('\n📋 Options to fix:');
    console.log('1. Keep only the latest record (by created_at) for each ref_id');
    console.log('2. Update duplicate ref_id to make them unique (e.g., append _1, _2)');
    console.log('3. Investigate why there are duplicates in the source data');
}

checkRefIdDuplicates().catch(console.error);
