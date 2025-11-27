
const path = require('path')
const fs = require('fs');
const pdf_find_data = require('./pdf_find_data');

const pdf_dir = path.join(__dirname, '..', 'pdfs');

const safe_pdf_regexp = /^[A-Za-z0-9._-]+\.pdf/;

function validate_pdf_request(filename){

    if (!safe_pdf_regexp.test(filename)){
        return {
            ok: false,
            status: 400,
            message: 'Error: Invalid PDF filename'
        };
    };

    const all_pdfs = pdf_find_data.load_pdf_metadata();
    const entry = all_pdfs.find(pdf => pdf.filename === filename);

    // Checking that the pdf file is listed in the metadata file
    if (!entry){
        return{
            ok: false,
            status: 404,
            message: 'Error: Unknown PDF file'
        };
    }

    const file_path = path.join(pdf_dir, filename);

    if (!fs.existsSync(file_path)){
        return {
            ok: false,
            status: 404,
            message: "Error: PDF file is listed in our metadata, but is missing from the server"
        };
    }

    return{
        ok: true,
        file_path,
        entry
    };

};

module.exports = {
    validate_pdf_request,
    pdf_dir
};