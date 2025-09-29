const path = require('path');
const XLSX = require('xlsx'); // Ensure this is the 'xlsx' library (SheetJS)
const fs = require('fs');

const GPT_EXCEL_PATH = path.join(__dirname, '../data/GPTMembers.xlsx');

exports.checkGPTActivation = async (req, res, next) => {
    console.log(`Worker ${process.pid}: GPT /verify-gpt endpoint hit.`);
    try {
        const { email, gptTitle } = req.body;

        if (!email || !gptTitle) {
            console.warn(`Worker ${process.pid}: GPT Bad Request: Email or gptTitle missing.`);
            return res.status(400).json({
                success: false,
                message: 'Bad Request: Both email and gptTitle are required.'
            });
        }
        console.log(`Worker ${process.pid}: GPT Verification attempt: Email="${email}", Title="${gptTitle}"`);

        if (!fs.existsSync(GPT_EXCEL_PATH)) {
            console.error(`Worker ${process.pid}: CRITICAL - GPTMembers.xlsx not found at ${GPT_EXCEL_PATH}`);
            return res.status(500).json({
                success: false,
                message: 'Membership data service unavailable (file read error).'
            });
        }

        const workbook = XLSX.readFile(GPT_EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          console.error(`Worker ${process.pid}: Error: GPTMembers.xlsx worksheet is empty or missing.`);
          return res.status(500).json({
            success: false,
            message: 'Membership data service unavailable (empty sheet)'
          });
        }

        // Logging raw cell values for headers
        const cellA1 = worksheet['A1'] ? worksheet['A1'].v : 'A1 not found or empty';
        const cellB1 = worksheet['B1'] ? worksheet['B1'].v : 'B1 not found or empty';
        const cellC1 = worksheet['C1'] ? worksheet['C1'].v : 'C1 not found or empty';
        console.log(`Worker ${process.pid}: GPT Excel - Raw Header Cell A1: "${cellA1}"`);
        console.log(`Worker ${process.pid}: GPT Excel - Raw Header Cell B1: "${cellB1}"`);
        console.log(`Worker ${process.pid}: GPT Excel - Raw Header Cell C1: "${cellC1}"`);


        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); // This uses the main xlsx library
        console.log(`Worker ${process.pid}: GPT Excel data rows: ${data.length}`);

        if (data.length > 0) {
            const firstRow = data[0];
            console.log(`Worker ${process.pid}: GPT Excel - Keys of first row object from sheet_to_json:`, Object.keys(firstRow));

            if (!firstRow.hasOwnProperty('Members') || !firstRow.hasOwnProperty('Title') || !firstRow.hasOwnProperty('GPT Usage')) {
                console.error(`Worker ${process.pid}: Excel Format Error: Missing required column headers (Members, Title, GPT Usage). Actual keys found: [${Object.keys(firstRow).join(', ')}]`);
                return res.status(500).json({
                  success: false,
                  message: "Membership data service unavailable (missing required columns)"
                });
            }
        } else {
            console.warn(`Worker ${process.pid}: GPTMembers.xlsx is empty.`);
             return res.status(403).json({
                success: false,
                message: 'Membership list is currently empty.'
            });
        }

        let userRowIndex = -1;
        const userRecord = data.find((row, index) => {
            if (row.Members && String(row.Members).toLowerCase() === email.toLowerCase()) {
                userRowIndex = index;
                return true;
            }
            return false;
        });

        if (!userRecord) {
            console.warn(`Worker ${process.pid}: GPT Access Denied: Email "${email}" not found.`);
            return res.status(403).json({
                success: false,
                message: 'Access Denied: Email not found in membership list.'
            });
        }

        if (userRecord.Title !== gptTitle) {
            console.warn(`Worker ${process.pid}: GPT Access Denied: Title mismatch for "${email}". Expected: "${userRecord.Title}", Received: "${gptTitle}".`);
            return res.status(403).json({
                success: false,
                message: `Access Denied: This activation is only valid for GPT titled "${userRecord.Title}".`
            });
        }

        if (String(userRecord['GPT Usage']).toLowerCase() === 'used') {
            console.warn(`Worker ${process.pid}: GPT Access Denied: Activation already used by "${email}".`);
            return res.status(403).json({
                success: false,
                message: 'Access Denied: This activation has already been used.'
            });
        }

        // --- This section should now work if 'xlsx' is correctly installed and required ---
        data[userRowIndex]['GPT Usage'] = 'Used';
        const updatedWorksheet = XLSX.utils.json_to_sheet(data); // This is a function of the main 'xlsx' library
        // To write back, you need to rebuild the workbook structure or update the existing one
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, updatedWorksheet, sheetName);
        XLSX.writeFile(newWorkbook, GPT_EXCEL_PATH); // This is also a function of the main 'xlsx' library
        // --- End writing section ---

        console.log(`Worker ${process.pid}: GPT Activation successful for "${email}". Marked as Used.`);

        return res.status(200).json({
            success: true,
            message: 'Activation successful! Access granted.'
        });

    } catch (error) {
        console.error(`Worker ${process.pid}: !!! UNEXPECTED ERROR during GPT activation handler:`, error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error during activation. Please try again later.'
        });
    }
};