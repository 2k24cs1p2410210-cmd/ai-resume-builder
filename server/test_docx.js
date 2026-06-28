import fs from 'fs';
import mammoth from 'mammoth';

async function run() {
  try {
    const buffer = fs.readFileSync('../my-resume.docx');
    console.log("Buffer size:", buffer.length);
    const docxData = await mammoth.extractRawText({ buffer });
    console.log("Extracted text length:", docxData.value.length);
    console.log("Extracted text snippet (first 1000 chars):");
    console.log(docxData.value.substring(0, 1000));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
