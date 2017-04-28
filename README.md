# realestate.com.au scraper
(unaffiliated with the site + solely for private use) 

## updates
- 4/28/17: scraping 'buy' listings now works (see new examples under output/) + refactoring of scrape.js

## requirements 

- [PhantomJS](http://phantomjs.org/download.html)
- [CasperJS](http://docs.casperjs.org/en/latest/installation.html) (see link, or try `brew install casperjs` or `npm i -g casperjs`)

## usage
- $ `git clone`
- $ `npm install` in this directory
- 1. to scrape: $ `casperjs scrape.js --type=[buy/sold] --query=['your query string, surrounded by quotes'] --output=['your output filename, without an extension']
	- example usage: $ `casperjs scrape.js --type=buy --query='diamond creek, vic 3089' --output='diamond-creek'` //will output to diamond-creek.csv
- 2. then run: $ `node convert.js [exact same filename as before]` (don't include an extension!)
	- example usage: $ `node convert.js diamond-creek` 

