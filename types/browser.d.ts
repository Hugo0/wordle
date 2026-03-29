/**
 * Browser API type augmentations for non-standard properties.
 */

interface Navigator {
    /** WebDriver detection — true when controlled by automation (Selenium, Puppeteer, etc.) */
    webdriver?: boolean;
}
