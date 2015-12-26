module.exports = hapiAccount
hapiAccount.attributes = {
  name: 'account'
}

var async = require('async')
var getApi = require('../api')
var merge = require('lodash.merge')

var routePlugins = [
  require('../routes/session'),
  require('../routes/account'),
  require('../routes/accounts')
]

var TIMEOUT_14_DAYS = 1209600
function hapiAccount (server, options, next) {
  var routeOptions = merge({}, options)
  routeOptions.sessionTimeout = options.sessionTimeout || TIMEOUT_14_DAYS

  options.usersDb.constructor.plugin(require('pouchdb-admins'))

  var users = getApi({
    db: options.usersDb,
    secret: options.config.db.secret,
    sessionTimeout: routeOptions.sessionTimeout
  })
  routeOptions.admins = options.usersDb.admins({
    secret: options.config.db.secret,
    admins: options.admins,
    sessionTimeout: routeOptions.sessionTimeout
  })
  delete routeOptions.secret

  server.expose({
    api: users
  })

  var usersDesignDoc = require('./couchdb/users-design-doc.js')
  var plugins = [{
    register: require('@gar/hapi-json-api'),
    options: {}
  }].concat(routePlugins.map(function (plugin) {
    return {
      register: plugin,
      options: routeOptions
    }
  }))

  async.parallel([
    putUsersDesignDoc.bind(null, options.usersDb, usersDesignDoc),
    server.register.bind(server, plugins)
  ], next)
}

function putUsersDesignDoc (db, designDoc, callback) {
  db.put(designDoc)

  .catch(function (error) {
    if (error.name !== 'conflict') {
      throw error
    }
  })

  .then(callback.bind(null, null), callback)
}
