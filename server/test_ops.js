import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  try {
    const data = new Uint8Array(fs.readFileSync('../../resume-try.pdf'));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const opList = await page.getOperatorList();
    
    console.log("Operator list length:", opList.fnArray.length);
    
    // Let's count some operator functions
    // For list of operator IDs, see pdfjsLib.OPS
    const OPS = pdfjsLib.OPS || {};
    const opNames = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));
    
    const counts = {};
    for (const fn of opList.fnArray) {
      const name = opNames[fn] || fn;
      counts[name] = (counts[name] || 0) + 1;
    }
    console.log("Operator counts:", counts);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
