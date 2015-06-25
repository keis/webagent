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

  var questions = [ { type: 'input'
                    , name: 'name'
                    , message: 'What should the relation be called'
                    }
                  , { type: 'input'
                    , name: 'mediatype'
                    , message: 'What type of page is that?'
                    }
                  ]

  inquirer.prompt(questions, function (answers) {
    mt.relation(answers.name, relation, answers.mediatype)
    callback()
  })
}

module.exports = function discover(opts, callback) {
  var site = new Site({})
    , prompts = []
    , pages
    , relations

  prompts.push({ type: 'list'
               , name: 'action'
               , message: "What's it going be then, eh?"
               , choices: ["Add page", "Add relation"]
               })

  prompts.push({ type: 'list'
               , name: 'page'
               , message: "Select page"
               , choices: function () { return pages }
               , when: function (ctx) { return ctx.action == 'Add page' }
               })

  prompts.push({ type: 'list'
               , name: 'relation'
               , message: "Select relation"
               , choices: function () { return relations }
               , when: function (ctx) { return ctx.action == 'Add relation' }
               })

  request.get(opts.url).end(function (err, res) {
    if (err) {
      return callback(err)
    }
    var $ = cheerio.load(res.text)
      , title = $('title').text()
      , links = $('a')
      , forms = $('form')
      , mt

    pages = []
    relations = []

    site.name = title
    site.entryPoint(opts.url, 'index')
    mt = site.mediaType('index')

    links.each(function () {
      var sel = makeSelector($(this))
        , url = $(this).attr('href')

      if (sel == null) {
        if (url) {
          pushuniq(pages, url)
        }
      } else {
        pushuniq(relations, sel)
      }
    })

    inquirer.prompt(prompts, function (answers) {
      if (answers.action == 'Add relation') {
        return addRelation(mt, $, answers.relation, function (err) {
          callback(err, err ? null : site)
        })
      }
      callback(null, answers)
    })
  })
}
