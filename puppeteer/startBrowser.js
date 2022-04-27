const puppeteer = require("puppeteer")

const startBrowser = async (headless = true) => {
  const browserOpts = {
    headless,
    ignoreHTTPSErrors: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
  const browser = await puppeteer.launch(browserOpts)

  browser.userAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
  )

  return browser
}

module.exports = startBrowser
