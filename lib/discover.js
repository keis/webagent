var request = require('superagent')
  , cheerio = require('cheerio')
  , find = require('component-find')
  , inquirer = require('inquirer')

function Site(data) {
  this.name = data.name
  this.entrypoints = data.entrypoints || []
  this.mediatypes = data.mediatypes || []
}

Site.prototype.entryPoint = function(url, mediatype) {
  var entrypoints = this.entrypoints
    , entrypoint

  if ((entrypoint = find(entrypoints, { url: url }))) {
    return entrypoint
  }

  entrypoint = { url: url
               , mediatype: mediatype
               }
  entrypoints.push(entrypoint)
  return entrypoint
}

Site.prototype.mediaType = function(id) {
  var mediatypes = this.mediatypes
    , id

  if ((mediatype = find(mediatypes, { id: id }))) {
    return mediatype
  }

  mediatype = new MediaType({ id: id })
  mediatypes.push(mediatype)
  return mediatype
}

function MediaType(data) {
  this.id = data.id
  this.relations = data.relations || []
}

MediaType.prototype.relation = function (rel, extr, mediatype) {
  var relations = this.relations
    , relation

  if ((relation = find(relations, { rel: rel }))) {
    return relation
  }

  relation = { rel: rel
             , extr: extr
             , mediatype: mediatype
             }
  relations.push(relation)
  return relation
}

function makeSelector(el, lvl) {
  var sel = el.get(0).name
    , par

  lvl = lvl || 0

  if (el.attr('id')) {
    return sel + '#' + el.attr('id')
  }

  if (el.attr('class')) {
   return sel + '.' + el.attr('class').split(' ').join('.')
  }

  if (lvl < 3 && (par = makeSelector(el.parent(), lvl + 1))) {
    return par + ' > ' + sel
  }

  return null
}

function pushuniq(l, o) {
  if (l.indexOf(o) == -1) {
    l.push(o)
  }
}

function addRelation(mt, $, relation, callback) {
  console.log('Selector: ', relation)
  $(relation).each(function () {
    console.log('E.g: ', $(this).attr('href'), '"' + $(this).text() + '"')
  })

  var prompts = [ { type: 'input'
                  , name: 'name'
                  , message: 'What should the relation be called'
                  }
                , { type: 'input'
                  , name: 'mediatype'
                  , message: 'What type of page is that?'
                  }
                ]

  inquirer.prompt(prompts, function (answers) {
    var rel = mt.relation(answers.name, relation, answers.mediatype)
    callback(null, rel)
  })
}

function addEntryPoint(site, url, callback) {
  var prompts = [ { type: 'input'
                  , name: 'mediatype'
                  , message: 'What type of page is that?'
                  }
                ]

  inquirer.prompt(prompts, function (answers) {
    var mt = site.entrypoint(url, answers.mediatype)
    callback(null, mt)
  })
}

module.exports = function discover(opts, callback) {
  var site = new Site({})
    , prompts
    , pages
    , relations
    , mt
    , $

  prompts = [ { type: 'list'
              , name: 'action'
              , message: "What's it going be then, eh?"
              , choices: ["Add page", "Add relation", "Done"]
              }
            , { type: 'list'
              , name: 'page'
              , message: "Select page"
              , choices: function () { return pages }
              , when: function (ctx) { return ctx.action == 'Add page' }
              }
            , { type: 'list'
              , name: 'relation'
              , message: "Select relation"
              , choices: function () { return relations }
              , when: function (ctx) { return ctx.action == 'Add relation' }
              }
            ]

  visitPage(opts.url, 'index', function (err) {
    if (err) {
      return callback(err)
    }

    site.name = $('title').text()
    innerLoop()
  })

  function visitPage(url, mediaType, callback) {
    request.get(url).end(function (err, res) {
      if (err) {
        return callback(err)
      }

      $ = cheerio.load(res.text)

      var links = $('a')
        , forms = $('form')

      site.entryPoint(opts.url, mediaType)
      mt = site.mediaType(mediaType)

      pages = []
      relations = []

      links.each(function () {
        var sel = makeSelector($(this))
          , url = $(this).attr('href')

        pushuniq(pages, url)
        if (sel != null) {
          pushuniq(relations, sel)
        }
      })

      callback(null)
    })
  }

  function innerLoop() {
    inquirer.prompt(prompts, function (answers) {
      switch (answers.action) {
      case 'Add relation':
        return addRelation(mt, $, answers.relation, function (err) {
          innerLoop()
        })
      case 'Add page':
        return addEntryPoint(site, $, answers.page, function (err) {
          innerLoop()
        })
      case 'Done':
        return callback(null, site)
      }

      innerLoop()
    })
  }
}
