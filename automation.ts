import { exec } from 'child_process';
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
    const ToDateLocator = page.locator(`table.p-datepicker-calendar td:not(.p-datepicker-other-month):not(.p-disabled) span:has-text("${toDateParsed.day}")`);
    await ToDateLocator.first().click(); 



    await page.getByRole('complementary').getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(5000);
    await page.waitForSelector('table');


    const rows = await page.$$('table tbody tr');
    console.log('length', rows.length);

    //  No data check
    if (rows.length === 1) {
        const firstRowText = await rows[0].textContent();

        // Modify this condition based on the exact message in the "no data" row
        if (firstRowText?.includes('No records found') || firstRowText?.includes('no data')) {
            console.log('No actual data found in the cost table. Skipping this event.');
            await browser.close();
        }
    }

    // Event Table
    for (let i = 0; i < rows.length; i++) {

        const rows = await page.$$('table tbody tr');
        const row = rows[i];

        const isDisabled = await row.evaluate(node => node.classList.contains('disabled-row'));
        if (isDisabled) {
            console.log('Row is disabled, skipping to the next one');
            continue;
        }


        const eventText = await row.textContent();

        // Skip any events that match MLB team names
        if (MLBTeams.some(team => eventText?.includes(team))) {
            console.log(`Skipping MLB event: ${eventText}`);
            continue;
        }
        await row.dblclick();

        const processedRows = new Set();
        await page.waitForSelector('p-table.table.ticketGroup tbody');
        const costTableRows = await page.$$('p-table.table.ticketGroup tbody tr');
        // check if no data in table
        if (costTableRows.length === 1) {
            const firstRowText = await costTableRows[0].textContent();
            if (firstRowText?.includes('No records found') || firstRowText?.includes('no data')) {
                console.log('No actual data found in the cost table. Skipping this event.');
                await page.goBack();
                await page.waitForSelector('table tbody tr');
                continue;
            }
        }
        const headers = await page.$$eval('p-table.table.ticketGroup thead th', ths => ths.map(th => th.textContent?.trim()));

        // Find the indexes of "Cost", "List Price", and other columns based on the headers
        const costIndex = headers.indexOf('Cost') + 1; // +1 because nth-child is 1-based
        const listPriceIndex = headers.indexOf('List Price') + 1;
        const rowIndex = headers.indexOf('Row') + 1;
        const sectionIndex = headers.indexOf('Section') + 1;
        const faceIndex = headers.indexOf('Face') + 1;
        console.log('index', costIndex,listPriceIndex,rowIndex,sectionIndex);
        //Ticket table   
        await page.waitForTimeout(5000);
        let myVariable: Number = 1;

        for (const costRow of costTableRows) {
            // check for duplicates
            const rowValue = await costRow.$eval(`td:nth-child(${rowIndex})`, el => el.textContent?.trim());
            const sectionValue = await costRow.$eval(`td:nth-child(${sectionIndex})`, el => el.textContent?.trim());
            const rowSectionPair = `${rowValue}-${sectionValue}`;
            // Check if this row-section pair has already been processed
            if (processedRows.has(rowSectionPair)) {
                console.log(`Skipping duplicate row with Row: ${rowValue} and Section: ${sectionValue}`);
                continue; // Skip this row as it's a duplicate
            }
            // Add the current row-section pair to the set
            processedRows.add(rowSectionPair);


            // Extract cost from each row
            const costText = await costRow.$eval('p-celleditor span.cell-info', el => el.textContent?.trim() || '');
            const cost = parseFloat(costText.replace(/,/g, '').replace('$', '') || '0');
            if (cost == 0){
                continue;
            }
            
            const newPrice = calculateNewPrice(cost);
            console.log(newPrice);
            await page.waitForTimeout(300);

            // Enter new List Price
            const listPriceCell = await costRow.$(`td:nth-child(${listPriceIndex})`);
            if (listPriceCell) {
                await listPriceCell.click();
                var priceInput = await listPriceCell.waitForSelector('input[type="number"]');
                if (priceInput) {
                    await priceInput.focus();
                    await priceInput.fill(newPrice.toString());
                    await priceInput.evaluate(input => input.blur());
                    console.log(`New price set: ${newPrice}`);

                } else {
                    console.error('Price input field not found');
                }

            } else {
                console.error('List price cell not found');
            }

            // market place set up
            const dropdownTrigger = await costRow.$('p-multiselect .p-multiselect-trigger');
            if (dropdownTrigger) {
                await dropdownTrigger.scrollIntoViewIfNeeded();
                let retries = 3;
                let panelVisible = false;

                while (retries > 0 && !panelVisible) {
                    await dropdownTrigger.click();
                    await page.waitForTimeout(1000); 
                    const isPanelVisible = await page.$('.ng-trigger-overlayAnimation.p-multiselect-panel');
                    if (isPanelVisible) {
                        panelVisible = true;
                        break;
                    }
                    retries--;
                }

                if (panelVisible) {
                    await page.waitForSelector('.p-checkbox-box', { state: 'attached' });
                    // checkboxes
                    await page.locator('.p-checkbox-box').first().click();
                    await page.waitForTimeout(500); 
                    await page.getByLabel('TicketNetwork Direct').locator('span').click();
                    await page.waitForTimeout(500); 
                    await page.getByLabel('Ticket Evolution').locator('span').click();
                    await page.waitForTimeout(500); 
                    await page.getByLabel('TickPick').locator('div').nth(1).click();
                } else {
                    console.error('Dropdown panel did not become visible after retries');
                }
            } else {
                console.error('Dropdown trigger not found for this row');
            }
            const activateButton = await costRow.$('button.p-button.p-component');
            if (activateButton) {
                const isActivated = await costRow.$('i.pi.pi-circle-on[style="color: #00A83E;"]');
                if (isActivated) {
                    continue;
                }
                else{
                    await activateButton.click();
                }
            } else {
                console.error('Activate button not found');
            }

            // Publish the listing
            // await page.click('text="Publish"');
        }
        try{
        await page.click('text="Publish"');
        await page.waitForTimeout(5000);

        // Go back to the event list
        await page.goBack();
        await page.waitForSelector('table tbody tr');
        }
        catch(error){
            await page.goBack();
            await page.waitForSelector('table tbody tr');
        }
    }

    await browser.close();
})();
