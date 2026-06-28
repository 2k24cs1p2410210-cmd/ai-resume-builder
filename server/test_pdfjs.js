import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  try {
    const data = new Uint8Array(fs.readFileSync('../../resume-try.pdf'));
    console.log("PDF bytes read:", data.length);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    console.log("Total pages:", pdf.numPages);
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      console.log(`--- Page ${i} textContent items:`, textContent.items.length);
      const strings = textContent.items.map(item => item.str);
      console.log(`Page ${i} strings:`, strings.join(' '));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
