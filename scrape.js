var fs = require('fs')
var casper = require('casper').create({
	verbose: true,
  	logLevel: 'info',
  	pageSettings: {
    	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
  	}
})

var url, query, filename
// configure based on args passed in from command line
url = 'https://www.realestate.com.au/' + casper.cli.get('type')
query = casper.cli.get('query')
filename = casper.cli.get('output') + '.js'

var currentPage = 1
var allPropertyInfo = []

function terminate() {
    this.echo('Exiting...').exit()
}

function logPropertyInfo () {

	// strips weird React wrapping in spans
	function cleanText(string) {
		return string.replace(/\<!-- \/?react-text(?:: )?[0-9]* \-->/g, '')
	}

	// returns an object with property info for the selector card
	function getInfo(cardSel) {
		var info = {
			link: null,
			price: null,
			address: '',
			type: '',
			solddate: null,
			beds: null,
			baths: null,
			cars: null
		}
		var cardContentSel = cardSel.querySelector('.property-card__content')

		// sets properties if available 
		info.link = cardSel.querySelector('.property-card__link').getAttribute('href')
		info.price = cardContentSel.querySelector('.property-price').innerHTML
		info.address = cleanText(cardContentSel.querySelector('.property-card__info-text span').innerHTML)
		info.type = cardContentSel.querySelector('.property-card__property-type').innerHTML
		info.solddate = cardContentSel.querySelector('.property-card__with-comma span').innerHTML.split('Sold on ')[1]

		if (cardContentSel.querySelector('.general-features')) {
			info.beds = cleanText(cardContentSel.querySelector('.general-features__beds').innerHTML)
			info.baths = cleanText(cardContentSel.querySelector('.general-features__baths').innerHTML)
			info.cars = cleanText(cardContentSel.querySelector('.general-features__cars').innerHTML)	
		}
		return info
	}

	var allPropertyInfo = document.querySelectorAll('.property-card')

	return Array.prototype.map.call(allPropertyInfo, function(e) {
		return getInfo(e)
	})
}

function writeToFile(filename, contentsAsArray) {
	console.log('Writing scraped data to output file at output/' + filename + '.js')
	fs.write(fs.pathJoin(fs.workingDirectory, 'output', filename), 'module.exports = ' + contentsAsArray, 'a')
}

function processPage() {
	// Adds property info for the current page's listings to the master array
	allPropertyInfo = allPropertyInfo.concat(this.evaluate(logPropertyInfo))

	// Terminates browsing and writes to output after reaching the last page or scraping 1,000 listings
	if (currentPage >= 50 || this.exists('.pagination__next > .pagination__link.rui-button-disabled')) {

		this.echo('Reached end of searchable data; terminating browsing')
		allPropertyInfo = require('utils').serialize(allPropertyInfo)
		writeToFile(filename, allPropertyInfo)
		return terminate.call(casper)
	}

	// Navigates to the next page, waits for it to load, and recurses
	currentPage += 1
	this.echo('Proceeding to the next page')
    this.thenClick('.pagination__next a.pagination__link')
    .then(function() {
        this.waitForSelectorTextChange('.total-results-count', processPage, terminate)
    })
}

// Navigate to the URL and wait for first load
casper.start(url, function() {
	// Wait for the page to be loaded
   	this.waitForSelector('input[id="where"]')
})

casper.then(function() {
   // Inputs search query text and submits form
   this.sendKeys('input[id="where"]', query, { reset: true })
   this.click('.rui-search-button')
})

casper.then(function() {
	// Start the scraping process
	this.waitForSelector('.results-card a', processPage, terminate)
})

casper.run()
