const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

console.log(`Processing: ${templatePath}`);

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);

    let docXml = zip.file("word/document.xml").asText();
    const originalLength = docXml.length;

    console.log("Original XML Length:", originalLength);

    // Strategy 1: Fix "Duplicate Open Tag" ({{ ... {{)
    // Regex explanation:
    // Match {{ 
    // Followed by any text that does NOT contain }} 
    // Followed by {{
    // This implies the first {{ was never closed.
    // Replace it with just the content (remove the first {{)

    let fixedXml = docXml;

    // We loop until no more bad patterns found to handle multiple nested levels
    let changed = true;
    let pass = 0;
    while (changed && pass < 5) {
        changed = false;
        pass++;

        // Find {{ followed by {{ without }} in between.
        // Capturing group 1 is the text between.
        // We replace " {{ TEXT {{ " with " TEXT {{ "
        // Note: XML tags <...> are treated as text here, which is correct (we ignore them)
        const regex = /\{\{([^{}]*)\{\{/g;

        if (regex.test(fixedXml)) {
            console.log(`Pass ${pass}: Found duplicate open tags. Fixing...`);
            fixedXml = fixedXml.replace(regex, "$1{{");
            changed = true;
        }
    }

    // Strategy 2: Fix "Duplicate Close Tag" (}} ... }})
    // Match }} followed by text without {{ followed by }}
    // Replace with }} TEXT
    // Actually, }} ... }} is usually fine (just text), but }} inside a tag is bad.
    // docxtemplater complains about "Duplicate Open". Close is usually ignored as text.
    // But let's fix known typo }} }
    fixedXml = fixedXml.replace(/\}\}\s*\}/g, "}}");

    // Strategy 3: Specific fixes for known legacy issues
    fixedXml = fixedXml.replace(/\{\{NAM\}\}\}/g, "{{NAM}}");
    fixedXml = fixedXml.replace(/\{\{NAM\}\}/g, "{{NAM}}");

    if (fixedXml.length !== originalLength) {
        console.log("XML modified. New Length:", fixedXml.length);
        zip.file("word/document.xml", fixedXml);

        const buf = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(templatePath, buf);
        console.log("Template cleaned and saved successfully!");
    } else {
        console.log("No common errors found. Template might be okay or have complex issues.");
        // Force save anyway to ensure binary consistency
        const buf = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(templatePath, buf);
    }

} catch (e) {
    console.error("Error:", e);
}
