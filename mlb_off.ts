import { chromium, Browser, Page } from 'playwright';

// save MLB Teams
const MLBTeams = [
    'Baltimore Orioles', 'Boston Red Sox', 'New York Yankees',
    'Tampa Bay Rays', 'Toronto Blue Jays', 'Chicago White Sox', 'Cleveland Guardians',
    'Detroit Tigers', 'Kansas City Royals', 'Minnesota Twins', 'Houston Astros',
    'Los Angeles Angels', 'Oakland Athletics', 'Seattle Mariners', 'Texas Rangers',
    'Atlanta Braves', 'Miami Marlins', 'New York Mets', 'Philadelphia Phillies',
    'Washington Nationals', 'Chicago Cubs', 'Cincinnati Reds', 'Milwaukee Brewers',
    'Pittsburgh Pirates', 'St. Louis Cardinals', 'Arizona Diamondbacks', 'Colorado Rockies',
    'Los Angeles Dodgers', 'San Diego Padres', 'San Francisco Giants'
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


const calculateNewPrice = (cost: number) => {
    const multipliers = [4.5, 4.6, 4.7, 4.8];
    const randomMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    console.log(`Selected multiplier: ${randomMultiplier}`);
    return Math.round(cost * randomMultiplier);
};


// Date inputs recieved
const args = process.argv.slice(2);

if (args.length !== 2) {
    console.error('Please provide the "From" and "To" dates in the format MM/DD/YYYY');
    process.exit(1);
}

const fromDate = args[0];
const toDate = args[1];

// console.log(`Using From date: ${fromDate} and To date: ${toDate}`);
const parseDate = (date: string) => {
    const [month, day, year] = date.split('/');
    return { month, day, year };
};

// Parse the "From" and "To" dates
const fromDateParsed = parseDate(fromDate);
const toDateParsed = parseDate(toDate);



(async () => {

    const browser: Browser = await chromium.launch({ headless: false });
    const page: Page = await browser.newPage();

    // Login and navigate to the revenue manager page
    await page.goto('https://members.logitix.com/v2/RevenueManagement');

    // Login if necessary
    await page.fill('input[id="email"]', 'csetickets@gmail.com');
    await page.fill('input[id="password"]', 'Welcome2024!');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle' });

    await page.click('text="Revenue Manager"');
    await page.click('text="Advanced Search"');


    // Date Selection 
    const isEven = (num: number) => num % 2 === 0;
    await page.getByRole('textbox', { name: 'From' }).click();
    await page.locator('.p-datepicker-header').click();
    await page.locator('.p-datepicker-header').click();

    // For From Date
    // Year
    try {
        await page.getByText(fromDateParsed.year, { exact: true }).click();

    } catch (error) {
        await page.getByText(fromDateParsed.year).click();
    }
    //Month 
    const fromMonth = monthNames[Number(fromDateParsed.month) - 1];
    try {
        await page.getByText(fromMonth, { exact: true }).click();
    } catch (error) {
        await page.getByText(fromMonth).click();
    }
    // Day
    const fromDateLocator = page.locator(`table.p-datepicker-calendar td:not(.p-datepicker-other-month):not(.p-disabled) span:has-text("${fromDateParsed.day}")`);
    await fromDateLocator.first().click(); 

    // To date selection
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'To' }).click();
    await page.locator('.p-datepicker-header').click();
    await page.locator('.p-datepicker-header').click();
    await page.waitForTimeout(500);
    // Year
    try {
        await page.getByText(toDateParsed.year, { exact: true }).click();
    } catch (error) {
        await page.getByText(toDateParsed.year).click();
    }
    //Month 
    const toMonth = monthNames[Number(toDateParsed.month) - 1];
    try {
        await page.getByText(toMonth, { exact: true }).click();
    } catch (error) {
        await page.getByText(toMonth).click();
    }
    // Day
    const ToDateLocator = page.locator(`table.p-datepicker-calendar td:not(.p-datepicker-other-month):not(.p-disabled) span:has-text("${toDateParsed.day}")`);
    await ToDateLocator.first().click(); 



    await page.getByRole('complementary').getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(5000);
    

    // No MLB Activation
    for (const team of MLBTeams) {
        console.log(`Processing team: ${team}`);    
        await page.getByPlaceholder('Search Event Name').click();
        await page.getByPlaceholder('Search Event Name').fill(team);
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await page.waitForTimeout(5000); 

        await page.waitForSelector('table');
        const MLBrows = await page.$$('table tbody tr');
        console.log('length',MLBrows.length);
        if (MLBrows.length === 1) {
            const firstRowText = await MLBrows[0].textContent();
            if (firstRowText?.includes('No records found') || firstRowText?.includes('no data')) {
                console.log('No actual data found in the cost table. Skipping this event.');
                continue;
            }
        }
        // MLB Listings
        let flag = 0;
        for (let i = 0; i < MLBrows.length; i++) {
            const MLBrows = await page.$$('table tbody tr');
            const MLBrow = MLBrows[i];
            const isDisabled = await MLBrow.evaluate(node => node.classList.contains('disabled-row'));

            if (isDisabled) {
                console.log('Row is disabled, skipping to the next one');
                continue; // Skip this iteration if the row is disabled
            }
            await MLBrow.dblclick();
            await page.waitForSelector('p-table.table.ticketGroup tbody');
            const costTableRows = await page.$$('p-table.table.ticketGroup tbody tr');
            if (costTableRows.length === 1) {
                const firstRowText = await costTableRows[0].textContent();
                if (firstRowText?.includes('No records found') || firstRowText?.includes('no data')) {
                    console.log('No actual data found in the cost table. Skipping this event.');
                    await page.goBack();
                    await page.waitForSelector('table tbody tr');
                    continue; 
                }
            }
            await page.waitForTimeout(5000);
            for (const costRow of costTableRows) {
                await page.waitForTimeout(1000); // Consider replacing with waitForSelector
                const activateButton = await costRow.$('button.p-button.p-component'); // Adjust selector if necessary

                if (activateButton) {
                    // Check if the button has the "pi-circle-on" icon with the green color
                    const isActivated = await costRow.$('i.pi.pi-circle-on[style="color: #00A83E;"]');

                    if (isActivated) {
                        flag = 1;
                        await activateButton.click();
                        console.log('activated row closed')
                    } 
                    else{
                        console.log('Not Activated')
                        // continue;
                    }
                } else {
                    console.error('Activate button not found');
                }
                  
            }
            if(flag === 1){
                await page.click('text="Publish"');
                console.log('Published')
            }
            await page.waitForTimeout(5000);

            await page.goBack();
            await page.waitForSelector('table tbody tr');
        }
    }
    await browser.close();
})();
