function doGet(e) {
  return HtmlService.createTemplateFromFile('TestMailDashboard')
    .evaluate()
    .setTitle('TestMail.app Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
