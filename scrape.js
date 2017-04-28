var fs = require('fs')
var casper = require('casper').create({
	verbose: true,
  	logLevel: 'info',
  	pageSettings: {
    	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
  	}
})

// configure based on args passed in from command line
var type, url, query, filename
type = casper.cli.get('type')
url = 'https://www.realestate.com.au/' + type
query = casper.cli.get('query')
filename = casper.cli.get('output') + '.js'

var currentPage = 1
var allPropertyInfo = []

var dev = true
if (dev) {
	casper.on('remote.message', function(message) {
	  this.echo('remote console.log: ' + message)
	})
} 

var sel = type === 'sold' 
	? {
		card: '.property-card',
		link: '.property-card__link',
		price: '.property-price',
		address: '.property-card__info-text span',
		features: '.general-features',
		next: '.pagination__next a.pagination__link',
		endReached: function() { return casper.exists('.pagination__next > .pagination__link.rui-button-disabled') },
		resultsCount: '.total-results-count',
		// property type + sold date only available for sold properties
		proptype: '.property-card__property-type',
		sold: '.property-card__with-comma span'
	} 
	: {
		card: '.resultBody',
		link: '.name',
		price: '.propertyStats p:first-child',
		address: '.name',
		features: '.rui-property-features',
		next: '.nextLink a',
		endReached: function() { return !casper.exists('.nextLink a') },
		resultsCount: '#resultsInfo p',
		// open house date + auction date only available for buy properties
		auction: '.type',
		open: '.openTime'
	} 

function terminate() {
	this.echo('Reached end of searchable data; terminating browsing')
	allPropertyInfo = require('utils').serialize(allPropertyInfo)
	writeToFile(filename, allPropertyInfo)
    this.echo('Exiting...').exit()
}

function logPropertyInfo (sel) {

	// checks within the bound selector for the field selector and returns data specified or null if selector doesn't exist. 
	function getField (fieldSel, attrib, transformFn) {
		var field = this.querySelector(fieldSel)
		if (field) {
			var result;
			switch (attrib) {
				case 'text': 
					result = field.innerText
					break
				case 'href':
					result = field.getAttribute('href')
					break
				default: 
					result = innerHTML
					break
			}
			if (transformFn) result = transformFn(result)
			return result 
		} else {
			return null
		}
	}

	// returns an object with property info for the given card
	function getInfo(cardSel) {
		var info = {
			link: null,
			price: null,
			address: null,
			beds: null,
			baths: null,
			cars: null
		}

		var getFieldBound = getField.bind(cardSel)

		// sets properties if available 
		info.link = getFieldBound(sel.link, 'href')
		info.price = getFieldBound(sel.price, 'text')
		info.address = getFieldBound(sel.address, 'text')

		// get extra properties 
		if (sel.proptype) {
			info.type = getFieldBound(sel.proptype, 'text')
			info.solddate = getFieldBound(sel.sold, 'text', function(str) { return str.split('Sold on ')[1] })
		} else {
			info.auctiondate = getFieldBound(sel.auction, 'text', function(str) { return str.split('Auction ')[1] }) 
			info.openhouse = getFieldBound(sel.open, 'text', function(str) { return str.split('Open ')[1] })
		}

		// get beds/baths/car count
		var features = getFieldBound(sel.features, 'text', function(str) { return str.match(/\d/g) })
		if (features) {
			info.beds = features[0] || null
			info.baths = features[1] || null
			info.cars = features[2]	|| null
		}

		return info
	}

	var propListings = document.querySelectorAll(sel.card)

	return Array.prototype.map.call(propListings, function(e) {
		//TODO: get child property listings for luxury projects
		if (sel.auction && e.querySelector('.project-child-listings')) return null
		else return getInfo(e)
	})
}

function writeToFile(filename, contentsAsArray) {
	console.log('Writing scraped data to output file at output/' + filename)
	fs.write(fs.pathJoin(fs.workingDirectory, 'output', filename), 'module.exports = ' + contentsAsArray, 'a')
}

function processPage() {
	// Adds property info for the current page's listings to the master array
	allPropertyInfo = allPropertyInfo.concat(this.evaluate(logPropertyInfo, sel))

	// Terminates browsing and writes to output after reaching the last page or scraping 1,000 listings
	if (currentPage >= 50 || sel.endReached()) {
		return terminate.call(casper)
	}

	// Navigates to the next page, waits for it to load, and recurses
	currentPage += 1
	this.echo('Proceeding to the next page')
    this.thenClick(sel.next)
    .then(function() {
    	if (type === 'sold') {
    		this.waitForSelectorTextChange(sel.resultsCount, processPage, terminate)
    	} else {
    		this.wait(5000, processPage, terminate)
    	}
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
	this.waitForSelector(sel.card, processPage, terminate)
})

casper.run()
