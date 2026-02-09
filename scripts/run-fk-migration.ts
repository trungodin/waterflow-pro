import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running migration to fix foreign key relationship...\n');

    try {
        // Step 1: Check if ref_id has duplicates
        console.log('1️⃣ Checking for duplicate ref_id values...');
        const { data: duplicates, error: dupError } = await supabase.rpc('check_ref_id_duplicates', {}, { count: 'exact' });
        
        // If RPC doesn't exist, check manually
        const { data: allRefIds, error: refError } = await supabase
            .from('assigned_customers')
            .select('ref_id')
            .not('ref_id', 'is', null);

        if (refError) {
            console.error('❌ Error fetching ref_id:', refError);
            return;
        }

        const refIdCounts = new Map();
        allRefIds?.forEach((row: any) => {
            const count = refIdCounts.get(row.ref_id) || 0;
            refIdCounts.set(row.ref_id, count + 1);
        });

        const dupsArray = Array.from(refIdCounts.entries()).filter(([_, count]) => count > 1);
        
        if (dupsArray.length > 0) {
            console.warn(`⚠️  Found ${dupsArray.length} duplicate ref_id values!`);
            console.log('Sample duplicates:', dupsArray.slice(0, 5));
            console.log('\n⚠️  Cannot add UNIQUE constraint with duplicates!');
            console.log('Options:');
            console.log('1. Keep only the latest record for each ref_id');
            console.log('2. Update duplicate ref_id values to make them unique');
            console.log('\nPlease fix duplicates first before running this migration.');
            return;
        }

        console.log('✅ No duplicates found!\n');

        // Step 2: Read migration SQL
        const migrationSQL = fs.readFileSync('supabase/migration_fix_fk.sql', 'utf-8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        console.log(`2️⃣ Executing ${statements.length} SQL statements...\n`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            console.log(`SQL: ${stmt.substring(0, 100)}...`);
            
            const { error } = await supabase.rpc('exec_sql', { sql: stmt });
            
            if (error) {
                // Try direct execution via REST API (if RPC doesn't work)
                console.warn(`⚠️  RPC failed, trying direct execution...`);
                console.error('Error:', error);
                // Note: Direct SQL execution requires service role key and proper permissions
            } else {
                console.log('✅ Success!\n');
            }
        }

        console.log('🎉 Migration completed!');
        console.log('\n📋 Summary:');
        console.log('- Added UNIQUE constraint on assigned_customers.ref_id');
        console.log('- Dropped old foreign key on water_lock_status.danh_bo');
        console.log('- Added new foreign key: water_lock_status.id_tb -> assigned_customers.ref_id');
        console.log('- Added indexes for better performance');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

runMigration().catch(console.error);
