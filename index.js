require('dotenv').config()

import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import { Client as PostgresClient } from 'pg'

import * as queries from './queries'
import * as middlewares from './middlewares'
import * as factories from './factories'
import * as notifications from './notifications'
import { log } from './utils'

//
// PostgreSQL client connection setup.
//
const postgresClient = new PostgresClient({ connectionString: process.env.DATABASE_URL })

//
// Express server setup.
//
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

//
// Initilize Express server.
//
const port = process.env.PORT || 7000
http.createServer(app).listen(port)
log.info(`1. Express server listen on port ${port}`)

//
// PostgreSQL connection.
// TODO: Refactor pg client instance events into directories like /pg/events/*
//
postgresClient.connect()
postgresClient.on('notice', msg => log.warning(`notice: ${msg}`))
postgresClient.on('error', err => log.error(`connection error ${err.stack}`))
log.info('2. PosgreSQL client connected.')

//
// Postgres listen/notify.
// TODO: Refactor pg client instance events into directories like /pg/events/*
//
postgresClient.on('notification', notifications.strategy({ app, postgresClient }))
notifications.listeners({ postgresClient })
log.info('3. PosgreSQL listening notifications.')

//
// Twilio call endpoints with configuration context on server init.
//
postgresClient.query(queries.getTwilioConfigs())
  .then(({ rowCount: count, rows: configs }) => {
    log.info('4. Exposing Express endpoints.')

    if (count > 0) {
      configs.forEach(twilioConfig => {
        const deps = { app, postgresClient }
        factories.twilioConfiguration(deps, twilioConfig)
      })
    }
    else log.error(' - No configuration to expose Twilio call endpoins.')
  })
  .catch(err => log.error('factory:catch', err))

//
// Express endpoints.
//
app.get('/ping', middlewares.ping())
app.post('/call-status-tracking', middlewares.callStatusTracking({ postgresClient }))
app.post('/forward-to', middlewares.forwardTo({ postgresClient }))
