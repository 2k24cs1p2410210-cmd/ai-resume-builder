import fs from 'fs';
import path from 'path';

async function runTest() {
  try {
    const pdfPath = path.resolve('../../resume-try.pdf');
    const fileBuffer = fs.readFileSync(pdfPath);
    
    // Create FormData manually to avoid external dependencies
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    
    // Construct request body buffer
    const header = `${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="my-resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
    const footer = `\r\n${boundary}--\r\n`;
    
    const bodyBuffer = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      fileBuffer,
      Buffer.from(footer, 'utf-8')
    ]);

    console.log("Sending POST to http://localhost:5000/api/resumes/import with mock auth...");
    const response = await fetch('http://localhost:5000/api/resumes/import', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary.slice(2)}`,
        'x-test-user-id': 'user_test_12345'
      },
      body: bodyBuffer
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
