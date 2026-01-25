const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

const VALID_TAGS = [
    'NAM', 'NGAY', 'THANG', 'TEN_KH', 'DIA_CHI', 'DANH_BA', 'MA_LO_TRINH',
    'TONG_KY', 'KY_NAM', 'TONG_TIEN', 'NGAY_HAN', 'NGAY_HAN_NGAY',
    'NGAY_HAN_THANG', 'NGAY_HAN_NAM', 'SO_NGAY_HAN', 'TIEU_DE_THONG_BAO',
    'NOI_DUNG_CANH_BAO', 'STT', 'SSTT', 'NAM}'
];

console.log(`Processing: ${templatePath}`);

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);

    let docXml = zip.file("word/document.xml").asText();
    const originalLength = docXml.length;

    console.log("Original XML Length:", originalLength);

    // Step 1: MASK valid tags
    // We search for {{ ... TAG ... }} allowing for XML tags in between
    let maskedXml = docXml;

    VALID_TAGS.forEach((tag, index) => {
        // Regex: {{ (any xml) TAG (any xml) }}
        // Be careful: regex needs to match {{ followed by tags/space followed by TAG followed by tags/space followed by }}
        // Pattern: \{\{(?:<[^>]+>|\s)*TAG(?:<[^>]+>|\s)*\}\}
        const pattern = new RegExp(`\\{\\{(?:<[^>]+>|\\s)*${tag.replace('}', '\\}')}(?:<[^>]+>|\\s)*\\}\\}`, 'g');

        maskedXml = maskedXml.replace(pattern, (match) => {
            // Replace with token matching the found string length to keep indices aligned? 
            // No, just replace with unique token.
            // We use a token like __MASK_0__
            return `__MASK_${index}__`;
        });
    });

    // Step 2: DESTROY remaining braces
    // Replace {{ with [[ and }} with ]]
    const cleanedXml = maskedXml.replace(/\{\{/g, "[[").replace(/\}\}/g, "]]");

    // Step 3: UNMASK
    // We can't just unmask simply because we lost the original XML content in Step 1.
    // Wait, Step 1 replaced the WHOLE string match (including <w:r> tags) with `__MASK_0__`.
    // This DESTROYS formatting (bold, color) inside the tag.
    // Is that acceptable? OLD logic did "No formatting change".
    // IF the tag was `{{<B>NAM</B>}}`, and we replace with `__MASK__` -> we lose <B>.
    // BUT we need to preserve `{{` and `}}` only for valid tags.

    // Better Strategy:
    // Mask ONLY the braces?
    // Find valid tag: `{{` (xml) `TAG` (xml) `}}`.
    // Replace start `{{` with `__OPEN__` and end `}}` with `__CLOSE__`.
    // Leave the XML content inside alone.

    let preservedXml = docXml;

    VALID_TAGS.forEach((tag) => {
        // Find all occurrences
        // Since JS regex doesn't support recursive matching nicely, we depend on the "Valid Tag" structure not containing {{ }} inside.

        // Construct regex to capture the parts
        const safeTag = tag.replace('}', '\\}');
        const regex = new RegExp(`(\\{\\{)((?:<[^>]+>|\\s)*${safeTag}(?:<[^>]+>|\\s)*)(\\}\\})`, 'g');

        preservedXml = preservedXml.replace(regex, (match, p1, p2, p3) => {
            return `__OPEN__${p2}__CLOSE__`;
        });
    });

    // Step 4: Clean remaining braces
    let finalXml = preservedXml.replace(/\{\{/g, "[").replace(/\}\}/g, "]");

    // Step 5: Restore valid braces
    finalXml = finalXml.replace(/__OPEN__/g, "{{").replace(/__CLOSE__/g, "}}");

    if (finalXml !== docXml) {
        console.log("Sanitized XML. Length:", finalXml.length);
        zip.file("word/document.xml", finalXml);
        const buf = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(templatePath, buf);
        console.log("Template FORCE CLEANED and saved!");
    } else {
        console.log("No stray braces found. Template seems clean.");
    }

} catch (e) {
    console.error("Error:", e);
}
