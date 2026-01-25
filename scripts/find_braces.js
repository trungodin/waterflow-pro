const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const xml = zip.file("word/document.xml").asText();

    console.log(`XML Length: ${xml.length}`);

    const tag = "TEN_KH";
    const idx = xml.indexOf(tag);

    if (idx === -1) {
        console.log("TAG NOT FOUND");
        process.exit(1);
    }

    console.log(`Found ${tag} at ${idx}`);

    // Scan Backwards
    let count = 0;
    for (let i = idx; i >= 0; i--) {
        if (xml[i] === '{') {
            count++;
            console.log(`Found '{' #${count} BACK at index ${i} (Distance: ${idx - i})`);
            if (count >= 5) break;
        }
    }

    // Scan Forwards
    count = 0;
    const endTag = idx + tag.length;
    for (let i = endTag; i < xml.length; i++) {
        if (xml[i] === '}') {
            count++;
            console.log(`Found '}' #${count} FWD at index ${i} (Distance: ${i - endTag})`);
            if (count >= 5) break;
        }
    }

} catch (e) {
    console.error(e);
}
