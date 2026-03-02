const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

fetch(`${url}/rest/v1/assigned_customers?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
})
    .then(res => res.json())
    .then(data => {
        console.log(Object.keys(data[0]));
    })
    .catch(console.error);
