import puppeteer from "puppeteer";
import * as path from "node:path";
import fs from "fs";


async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}


async function getData(componentsType) {
    const browser = await puppeteer.launch({
        headless: true,
    });
    const page = await browser.newPage();
    const products = []

    await page.click('.catalog-pagination__secondary')
    const pages = await page.$$eval('ul.catalog-pagination__pages-list>li', (items)=>items.length)

    for (let pageNum = 1; pageNum <= pages; pageNum++) {
        const url = `${process.env.BASE_URL}/${componentsType}?page=${pageNum}/`;
        console.log(`Loading page ${pageNum}`);

        await page.goto(url);
        await page.waitForSelector('.catalog-form__offers-list');

        await autoScroll(page);

        const pageProducts = await page.evaluate(
            ()=> {
                const items = [];
                document.querySelector('.catalog-form__offers-unit.catalog-form__offers-unit_primary').forEach(item => {
                    try {
                        const productNameElement = item.querySelector('div.catalog-form__description.catalog-form__description_primary.catalog-form__description_base-additional.catalog-form__description_font-weight_semibold.catalog-form__description_condensed-other');
                        const productUrlElement = item.querySelector('a.catalog-form__link.catalog-form__link_primary-additional.catalog-form__link_base-additional.catalog-form__link_font-weight_semibold.catalog-form__link_nodecor');
                        const productImgElement = item.querySelector('img');
                        const productPriceElement = item.querySelector('div.catalog-form__description.catalog-form__description_huge-additional.catalog-form__description_font-weight_bold.catalog-form__description_condensed-other.catalog-form__description_primary');
                        const productRatingElement = item.querySelector('span.catalog-form__rating-value');

                        const productName = productNameElement?.innerText || 'Empty';
                        const productUrl = productUrlElement?.href || 'Empty';
                        const productImg = productImgElement?.src || 'Empty';
                        const productPrice = productPriceElement?.innerText || 'Empty';
                        const productRating = productRatingElement?.innerText || 'No Rated';

                        items.push({
                            productName,
                            productUrl,
                            productImg,
                            productPrice,
                            productRating,
                        })
                    } catch (error) {
                        console.error(`Error at parsing: ${error}`);
                    }
                });
                return items;
            });

        console.log(`Loading page ${pageNum}`);
        console.log(`Find products: ${products.length}`);

        products.push(...pageProducts);
    }

    // Save data to JSON:
    const outputDir = path.resolve(process.env.OUTPUT_DIR);
    const outputFile = path.join(outputDir, `${componentsType}.json`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }

    fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
    console.log(`Data written to ${outputFile}.json`);

    await browser.close();
}

export default getData;