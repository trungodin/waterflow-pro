const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../public/templates/thong_bao_template.docx');

console.log(`Processing: ${templatePath}`);

try {
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);

    let docXml = zip.file("word/document.xml").asText();

    if (!docXml) {
        console.error("Could not read word/document.xml");
        process.exit(1);
    }

    console.log("Original XML Length:", docXml.length);

    // 1. Fix {{NAM}}} -> {{NAM}} (handling intervening tags)
    // Regex: {{ (tags) NAM (tags) }} (tags) } 
    // This is hard.
    // Simpler: Just remove "}" if it follows "}}" ?
    // Or replace "}}}" with "}}" globally (ignoring tags in between is hard, but usually "}}" are close).

    // Let's attempt simple string replacements first, assuming tags don't split the braces too badly for the error case.
    // The "Duplicate open tag" means we have {{ ... {{.
    // Maybe we should just look for "{{" and if we find another "{{" before "}}", likely the first one is text?

    // Aggressive Fixes:

    // Fix 1: Remove triple braces
    docXml = docXml.replace(/\{\{\{/g, "{{");
    docXml = docXml.replace(/\}\}\}/g, "}}");

    // Fix 2: {{NAM}}} specifically
    // Try to match {{NAM with optional tags then }}}
    // pattern: \{\{(<[^>]+>)*NAM(<[^>]+>)*\}\}(<[^>]+>)*\}
    docXml = docXml.replace(/\{\{((?:<[^>]+>)*)NAM((?:<[^>]+>)*)\}\}((?:<[^>]+>)*)\}/g, "{{$1NAM$2}}$3");

    // Fix 3: Handle "Duplicate Open" {{ ... {{
    // This is the main error.
    // If we have {{ (no }) {{, it's an error.
    // Regex: \{\{ [^}]* \{\{ -> This is risky as [^}] matches tags.
    // But within valid XML, text is in <w:t>.

    // Manual Scan Strategy
    // We will rebuild the XML? No.

    // Let's just Apply the legacy fix patterns aggressively.
    docXml = docXml.replace(/\{\{\{\{/g, "{{");
    docXml = docXml.replace(/\}\}\}\}/g, "}}");

    // Also "NAM}" might be the culprit if it looks like { NAM } }
    docXml = docXml.replace(/NAM\}/g, "NAM");

    zip.file("word/document.xml", docXml);

    const buf = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(templatePath, buf);

    console.log("Template cleaned and saved successfully!");

} catch (e) {
    console.error("Error:", e);
}
