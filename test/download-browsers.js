const {buildDriver} = require('./webdriver');
// Download the browser(s).
async function download() {
  if (process.env.BROWSER_A && process.env.BROWSER_B) {
    (await buildDriver(process.env.BROWSER_A.split(',')[0], {version: process.env.BROWSER_A.split(',')[1]})).quit();
    (await buildDriver(process.env.BROWSER_B.split(',')[0], {version: process.env.BROWSER_B.split(',')[1]})).quit();
  } else {
    (await buildDriver()).quit();
  }
}
download();
