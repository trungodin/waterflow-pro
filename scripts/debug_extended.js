const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const xml = zip.file("word/document.xml").asText();

    console.log("=== EXTENDED XML CONTEXT ===");

    const tag = "TEN_KH";
    const idx = xml.indexOf(tag);

    if (idx !== -1) {
        console.log(`Found ${tag} at ${idx}`);
        // Dump 1000 chars before and 1000 after
        const start = Math.max(0, idx - 1000);
        const end = Math.min(xml.length, idx + 1000);
        console.log("--- START CONTEXT ---");
        console.log(xml.substring(start, end));
        console.log("--- END CONTEXT ---");
    } else {
        console.log("TAG NOT FOUND IN XML!");
    }

} catch (e) {
    console.error(e);
}
