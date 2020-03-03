const axios = require('axios');
const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');

const deletingNodes = [
	'.layout__row_services',
	'.layout__row_navbar',
	'.layout__row_promo-blocks',
	'.layout__row_footer',
	'.layout__row_footer-links',
	'.page-header_small',
	'.page-header__banner',
];

(async deletingNodes => {
	const chrome = await chromeLauncher.launch({
		chromeFlags: ['--headless', '--disable-gpu'],
	});

	const response = await axios.get(
		`http://localhost:${chrome.port}/json/version`,
	);
	const { webSocketDebuggerUrl } = response.data;

	const browser = puppeteer.connect({
		browserWSEndpoint: webSocketDebuggerUrl,
	});
	const linkListSelector = '.spoiler_text a';

	const page = (await browser).newPage();
	await (await page).goto('https://habr.com/ru/company/ruvds/blog/337042/');
	await (await page).waitForSelector(linkListSelector, { timeout: 0 });

	const links = await (await page).$$eval(linkListSelector, links =>
		links.map(item => ({
			link: item.href,
			text: item.text.replace('/', ' '),
		})),
	);

	for (const [index, item] of links.entries()) {
		try {
			await (await page).goto(item.link, {
				timeout: 10000,
				waitUntil: 'networkidle2',
			});
			await (await page).evaluate(deletingNodes => {
				deletingNodes.map(elem =>
					document.querySelector(elem).remove(),
				);

				const companyPost = document.querySelector('.company_post');
				const article = document.querySelector('.post_full');

				companyPost.innerHTML = '';
				companyPost.appendChild(article);
			}, deletingNodes);
			await (await page).pdf({
				path: `docs/${index + 1}. ${item.text}.pdf`,
				format: 'A4',
				margin: {
					top: '10mm',
					right: '10mm',
					bottom: '10mm',
					left: '10mm',
				},
			});
		} catch (err) {
			console.log(`Can't save ${item.link}. ${err.message}`);
		} finally {
			console.log(`Complete ${item.link}`);
		}
	}

	await (await browser).close;
	await (await chrome).kill();

	console.log('Complete!');
})(deletingNodes);
