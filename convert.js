var fs = require('fs')
var path = require('path')
var jsonexport = require('jsonexport')

var args = process.argv.slice(2)
var inputArray = require(`./output/${args[0]}`)

jsonexport(inputArray, function(err, csv) {
    if (err) return console.log(err)
    fs.writeFile(path.join('./output', `${args[0]}.csv`), csv, function(err) {
    	if (err) return console.log(err) 
    	console.log(`Successfully converted data to CSV! Check output/${args[0]}.csv!`)
    })
})