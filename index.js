require('dotenv').config()

import http from 'http'
import request from 'request'
import express from 'express'
import bodyParser from 'body-parser'
import twilio from 'twilio'
import { Client as PostgresClient } from 'pg'

import * as queries from './queries'
import * as middlewares from './middlewares'
import { debug } from './utils'

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
//
postgresClient.connect()
postgresClient.on('notice', msg => console.warn(`notice: ${msg}`.yellow))
postgresClient.on('error', err => console.error(`connection error ${err.stack}`.red))
console.info('2. PosgreSQL client connected.'.yellow)

//
// Postgres listen/notify.
//
postgresClient.on('notification', ({ channel, payload: textPayload }) => {
  if (channel === 'twilio_call_created') {
    const payload = JSON.parse(textPayload) || {}

    debug(info => {
      info('Listen notify triggered!')
      info('Calling endpoint `/call` from notify trigger')
    })

    if (process.env.ENABLE_TWILIO_CALL === '1') {
      request.post(`${process.env.APP_DOMAIN}/call`, { form: payload })
    }
  }
})

postgresClient.query(`LISTEN twilio_call_created;`)
console.info('3. PosgreSQL listening notifications.')

//
// Factory: Twilio call endpoints with configuration context.
//
postgresClient.query(queries.getTwilioConfigs())
  .then(({ rowCount: count, rows: configs }) => {
    console.info('4. Exposing Express endpoints.')

    if (count > 0) {
      configs.forEach(config => {
        //
        // Twilio client setup.
        //
        const twilioClient = twilio(
          config.twilio_account_sid,
          config.twilio_auth_token
        )

        //
        // Express server endpoints setup.
        //
        const deps = { twilioClient, postgresClient }
        app.get('/ping', middlewares.ping())
        app.post('/call-status-tracking', middlewares.callStatusTracking(deps))
        app.post('/call', middlewares.call(deps))
        app.post('/forward-to', middlewares.forwardTo(deps))

        console.info(` - Endpoints for community: [${config.community_id}]`.cyan)
      })
    }
    else console.error(' - No configuration to expose Twilio call endpoins.'.red)
  })
  .catch(err => console.error('factory:catch', err))
