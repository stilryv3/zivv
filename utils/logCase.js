const fs = require('fs');
const path = require('path');

const casesPath = path.join(__dirname, '..', 'database', 'mod-cases.json');

function generateCaseId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function logCase(newCase) {
  let cases = [];

  if (fs.existsSync(casesPath)) {
    const data = fs.readFileSync(casesPath, 'utf-8');
    cases = JSON.parse(data);
  }

  let caseId;
  do {
    caseId = generateCaseId();
  } while (cases.find(c => c.id === caseId));

  newCase.id = caseId;
  cases.push(newCase);

  fs.writeFileSync(casesPath, JSON.stringify(cases, null, 2));
  return caseId;
}

module.exports = logCase;
