require('dotenv').config()

import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import { Client as PostgresClient } from 'pg'

import * as queries from './queries'
import * as middlewares from './middlewares'
import * as factories from './factories'
import * as notifications from './notifications'

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
console.info(`1. Express server listen on port ${port}`)

//
// PostgreSQL connection.
// TODO: Refactor pg client instance events into directories like /pg/events/*
//
postgresClient.connect()
postgresClient.on('notice', msg => console.warn(`notice: ${msg}`.yellow))
postgresClient.on('error', err => console.error(`connection error ${err.stack}`.red))
console.info('2. PosgreSQL client connected.')

//
// Postgres listen/notify.
// TODO: Refactor pg client instance events into directories like /pg/events/*
//
postgresClient.on('notification', notifications.strategy({ app, postgresClient }))
notifications.listeners({ postgresClient })
console.info('3. PosgreSQL listening notifications.')

//
// Twilio call endpoints with configuration context on server init.
//
postgresClient.query(queries.getTwilioConfigs())
  .then(({ rowCount: count, rows: configs }) => {
    console.info('4. Exposing Express endpoints.')

    if (count > 0) {
      configs.forEach(twilioConfig => {
        const deps = { app, postgresClient }
        factories.twilioConfiguration(deps, twilioConfig)
      })
    }
    else console.error(' - No configuration to expose Twilio call endpoins.'.red)
  })
  .catch(err => console.error('factory:catch', err))

//
// Express endpoints.
//
app.get('/ping', middlewares.ping())
app.post('/call-status-tracking', middlewares.callStatusTracking({ postgresClient }))
app.post('/forward-to', middlewares.forwardTo({ postgresClient }))
