/* Minimal CSInterface for FlexCaptions (evalScript + system path).
   The full Adobe CSInterface has more; this covers what the panel uses. */
var SystemPath = {
  EXTENSION: "extension",
  USER_DATA: "userData",
  COMMON_FILES: "commonFiles",
  MY_DOCUMENTS: "myDocuments",
  HOST_APPLICATION: "hostApplication"
};

function CSInterface() {}

CSInterface.prototype.evalScript = function (script, callback) {
  if (callback === null || callback === undefined) { callback = function () {}; }
  try { window.__adobe_cep__.evalScript(script, callback); }
  catch (e) { callback("ERR: CEP bridge unavailable (" + e + ")"); }
};

CSInterface.prototype.getSystemPath = function (pathType) {
  var p = "";
  try { p = window.__adobe_cep__.getSystemPath(pathType); } catch (e) { return ""; }
  try { p = decodeURIComponent(p); } catch (e2) {}
  if (p.indexOf("file://") === 0) { p = p.substring(7); }
  if (/^\/[A-Za-z]:\//.test(p)) { p = p.substring(1); }   // Windows "/C:/.." -> "C:/.."
  return p;
};

CSInterface.prototype.getApplicationID = function () {
  try { return JSON.parse(window.__adobe_cep__.getHostEnvironment()).appName; }
  catch (e) { return ""; }
};

CSInterface.prototype.getHostEnvironment = function () {
  try { return JSON.parse(window.__adobe_cep__.getHostEnvironment()); } catch (e) { return {}; }
};
