var discover = require('./lib/discover')


// Discover
// Fetch page
// Detect links and "interesting" data
//   - ignore already mapped urls
// prompt user to add links and extractions
// Save to json spec of website

// Compose
// Join request together to form actions

// Act
// Perform an action


function main() {
  var cli

  cli = require('meow')({
    help: 'Usage: webagent discover <url>'
  })

  switch (cli.input[0]) {
  case 'discover':
    discover({url: cli.input[1]}, function (err, data) {
      if (err) {
        return console.error(err)
      }
      console.log(JSON.stringify(data, null, 2))
    })
    break
  default:
    console.error("What?")
    break
  }
}

// Do stuff if this is the main module.
if (require.main === module) {
  main()
}
