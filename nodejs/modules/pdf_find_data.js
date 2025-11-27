const fs = require('fs');
const path = require('path');

function load_pdf_metadata(){
    const metadata_path = path.join(__dirname, '../metadata/pdf_metadata.json'); // going to the metadata file for the pdfs
    const raw_data = fs.readFileSync(metadata_path, 'utf8') // Reading the raw data as text
    return JSON.parse(raw_data); // Convert the JSON text into a JavaScript array
};

module.exports = {load_pdf_metadata};