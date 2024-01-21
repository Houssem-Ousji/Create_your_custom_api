const { default: puppeteer } = require("puppeteer");
const fs = require('fs');

const url = "https://www.capcar.fr/voiture-occasion?"

fetchProductList = async (url, brand_value) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: null,
        args: [
            '--start-maximized', // you can also use 
        ]
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "networkidle2" })

    let data = {
        extractionDate: new Date(),
        brand: brand_value != null ? brand_value : 'All brands',
        cars: []
    }

    if (brand_value != null) {
        const brandsButton = await page.$$("button")
        await brandsButton[2].click()
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const cookiesButton = await page.waitForSelector('[id="axeptio_btn_dismiss"]')
            await cookiesButton.click()
        } catch (error) {
        }

        try {
            let brandButton = await page.waitForSelector(`[id="brand${brand_value}"]`)
            await new Promise(resolve => setTimeout(resolve, 5000));
            await brandButton.click()
        } catch (error) {
            throw new Error(`the brand ${brand_value} is not found`)
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        await page.reload()
    }

    let nextPageExist = true

    try {
        do {
            let listIsCompleted = false
            let i = 0
            while (!listIsCompleted) {
                let car = {
                    brand: '',
                    model: '',
                    name: '',
                    releaseDate: '',
                    mileage: '',
                    fuelType: '',
                    gearbox: '',
                    price: '',
                    img_souce: ''
                }
                let carItem = await page.$(`[style="order:${i}"]`)
                if (carItem == null) {
                    listIsCompleted = true
                }
                else {
                    car.brand = await page.evaluate((el) => el.querySelector(`[itemprop="brand"]`).innerText, carItem)
                    car.model = await page.evaluate((el) => el.querySelector(`[itemprop="model"]`).innerText, carItem)
                    car.name = await page.evaluate((el) => el.querySelectorAll(".leading-tight")[1].innerText, carItem)
                    car.releaseDate = await page.evaluate((el) => el.querySelector(".text-left").innerText, carItem)
                    car.mileage = await page.evaluate((el) => el.querySelector(`[itemprop="mileageFromOdometer"]`).innerText, carItem)
                    car.fuelType = await page.evaluate((el) => el.querySelector(`[itemprop="fuelType"]`).innerText, carItem)
                    car.gearbox = await page.evaluate((el) => el.querySelector(`[itemprop="vehicleTransmission"]`).innerText, carItem)
                    car.price = await page.evaluate((el) => el.querySelector('[itemprop="offers"]').innerText, carItem)
                    car.img_souce = await page.evaluate((el) => el.querySelector('img').getAttribute("src"), carItem)
                    data.cars.push(car)
                    i++
                }
            }
            const nextButton = await page.$('[rel="next"]')
            if (nextButton != null) {
                await nextButton.click()
                await page.waitForNavigation()
                await page.reload();
            }
            else {
                nextPageExist = false
            }
        } while (nextPageExist);
    } catch (error) {
        console.log(error)
    }
    await browser.close()
    return data
}
const date = new Date().toISOString().split('T')[0]
fetchProductList(url, null).then((data) => {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFile(`data-${date}.json`, jsonData, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file created successfully.');
        }
    });
});