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

  if (cli.input[0] == 'discover') {
    return discover({url: cli.input[1]}, function (err, data) {
      if (err) {
        return console.error(err)
      }
      console.log(JSON.stringify(data, null, 2))
    })
  }

  console.error("What?")
}

// Do stuff if this is the main module.
if (require.main === module) {
  main()
}
