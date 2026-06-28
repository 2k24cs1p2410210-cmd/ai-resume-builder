import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function run() {
  try {
    const pdfBuffer = fs.readFileSync('../../sushant-resume.docx.pdf');
    console.log("Buffer size:", pdfBuffer.length);
    const parser = new PDFParse({ data: pdfBuffer });
    const pdfData = await parser.getText();
    console.log("pdfData is:", pdfData);
    console.log("Text length:", pdfData.text.length);
    console.log("Text snippet (first 1000 chars):");
    console.log(pdfData.text.substring(0, 1000));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
