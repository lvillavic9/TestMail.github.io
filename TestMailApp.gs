const TESTMAIL_CONFIG = {
  API_KEY: 'e769cbfe-db59-4af7-97d3-74703239d385',
  BASE_URL: 'https://api.testmail.app/api/json',
  NAMESPACE: 'wjlcs'
};

function getAllArrivedEmails(limit = 400) {
  try {
    const url = `${TESTMAIL_CONFIG.BASE_URL}?apikey=${TESTMAIL_CONFIG.API_KEY}&namespace=${TESTMAIL_CONFIG.NAMESPACE}&limit=${limit}`;
    const response = UrlFetchApp.fetch(url, { method: 'GET', muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return json.emails || [];
    } else {
      Logger.log(`Error HTTP: ${response.getResponseCode()} - ${response.getContentText()}`);
      return [];
    }
  } catch (error) {
    Logger.log(error);
    return [];
  }
}

// Devuelve lista única de correos (alias) usados en todos los mensajes recibidos
function getAliasHistoryForFrontend() {
  const emails = getAllArrivedEmails(400);
  const aliasesSet = new Set();
  emails.forEach(e => {
    if (e.to && e.to.startsWith('wjlcs.') && e.to.endsWith('@inbox.testmail.app')) {
      aliasesSet.add(e.to);
    }
  });
  return Array.from(aliasesSet).sort(); // orden alfabético
}

function getEmailsByAlias(alias, limit = 40) {
  const emails = getAllArrivedEmails(400);
  const filtered = emails.filter(e => e.to === alias);
  return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

function getAllEmailsForFrontend() {
  const emails = getAllArrivedEmails(400);
  return emails.sort((a, b) => b.timestamp - a.timestamp);
}

function getEmails(tag = 'test', limit = 20, offset = 0, livequery = false) {
  try {
    const url = `${TESTMAIL_CONFIG.BASE_URL}?apikey=${TESTMAIL_CONFIG.API_KEY}&namespace=${TESTMAIL_CONFIG.NAMESPACE}&tag=${encodeURIComponent(tag)}&limit=${limit}&offset=${offset}&livequery=${livequery}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return json;
    } else {
      throw new Error(`Error HTTP: ${response.getResponseCode()}`);
    }
  } catch (error) {
    Logger.log(error);
    return {emails: []};
  }
}

function searchEmails(tag, subject = '', from = '', limit = 10) {
  try {
    let url = `${TESTMAIL_CONFIG.BASE_URL}?apikey=${TESTMAIL_CONFIG.API_KEY}&namespace=${TESTMAIL_CONFIG.NAMESPACE}&tag=${encodeURIComponent(tag)}&limit=${limit}`;
    if (subject) url += `&subject=${encodeURIComponent(subject)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    const response = UrlFetchApp.fetch(url);
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log(error);
    throw error;
  }
}

function getLatestEmail(tag) {
  try {
    const emails = getEmails(tag, 1, 0);
    if (emails.emails && emails.emails.length > 0) {
      return emails.emails[0];
    }
    return null;
  } catch (error) {
    Logger.log(error);
    return null;
  }
}

function waitForNewEmail(tag, timeoutSeconds = 30) {
  try {
    const url = `${TESTMAIL_CONFIG.BASE_URL}?apikey=${TESTMAIL_CONFIG.API_KEY}&namespace=${TESTMAIL_CONFIG.NAMESPACE}&tag=${encodeURIComponent(tag)}&limit=1&livequery=true`;
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = JSON.parse(response.getContentText());
    if (data.emails && data.emails.length > 0) {
      return data.emails[0];
    }
    return null;
  } catch (error) {
    Logger.log(error);
    throw error;
  }
}

function getEmailBodyById(aliasOrTag, emailId) {
  let emails;
  if (aliasOrTag === 'todos') {
    emails = getAllEmailsForFrontend();
  } else if (aliasOrTag.includes('@')) {
    emails = getEmailsByAlias(aliasOrTag, 40);
  } else {
    emails = getEmails(aliasOrTag, 50).emails || [];
  }
  const email = emails.find(e => e.id == emailId);
  if (!email) return {};
  return {
    subject: email.subject,
    from: email.from,
    to: email.to,
    html: email.html,
    text: email.text
  };
}

// Opcionales: para herramientas avanzadas
function validateAPIConfiguration() {
  try {
    getEmails('validation_test', 1);
    return true;
  } catch (error) {
    return false;
  }
}
function createEmailReport(tag = 'test', sheetName = 'TestMail Report') {
  try {
    const emails = getEmails(tag, 50);
    let sheet;
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    try {
      sheet = spreadsheet.getSheetByName(sheetName);
      sheet.clear();
    } catch (e) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    const headers = ['Fecha', 'De', 'Para', 'Asunto', 'Preview'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    if (emails.emails && emails.emails.length > 0) {
      const data = emails.emails.map(email => {
        const date = new Date(email.timestamp * 1000);
        const preview = (email.text || '').substring(0, 100) + '...';
        return [date, email.from, email.to, email.subject, preview];
      });
      sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    sheet.autoResizeColumns(1, headers.length);
  } catch (error) {
    Logger.log(error);
  }
}
