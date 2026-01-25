const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const docXml = zip.file("word/document.xml").asText();

    console.log("=== SCANNING FOR {{ PATTERNS ===");

    let regex = /\{\{/g;
    let match;
    while ((match = regex.exec(docXml)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(docXml.length, match.index + 100);
        console.log(`Match at ${match.index}:`);
        console.log("..." + docXml.substring(start, end) + "...");
        console.log("---------------------------------------------------");
    }

    console.log("=== SCANNING FOR NAM PATTERNS ===");
    regex = /NAM/g;
    while ((match = regex.exec(docXml)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(docXml.length, match.index + 100);
        console.log(`Match at ${match.index}:`);
        console.log("..." + docXml.substring(start, end) + "...");
        console.log("---------------------------------------------------");
    }

} catch (e) {
    console.error(e);
}
