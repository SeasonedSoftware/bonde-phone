require('dotenv').config()

import http from 'http'
import request from 'request'
import express from 'express'
import bodyParser from 'body-parser'
import twilio, { twiml } from 'twilio'
import { Client as PostgresClient } from 'pg'

import * as queries from './queries'
import * as middlewares from './middlewares'

//
// PostgreSQL client configuration
//
const postgresClient = new PostgresClient({ connectionString: process.env.DATABASE_URL })

//
// Twilio client setup
//
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const VoiceResponse = twiml.VoiceResponse

//
// Express server setup
//
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

//
// Express server endpoints
//
app.get('/ping', middlewares.ping())

app.post('/call-status-tracking', middlewares.callStatusTracking({ postgresClient }))
app.post('/call', middlewares.call({ twilioClient, postgresClient }))
app.post('/forward-to', middlewares.forwardTo({ postgresClient }))

//
// Initilize Express server
//
const port = process.env.PORT || 7000
http.createServer(app).listen(port)
console.info(`1. Express server listen on port ${port}`)

//
// PostgreSQL connection
// TODO: refact into a separated file
//
postgresClient.connect()
postgresClient.on('notice', msg => console.warn('notice:', msg))
postgresClient.on('error', err => console.error('connection error', err.stack))

console.info('2. PosgreSQL client connected and watching notifications')

postgresClient.on('notification', ({ channel, payload: textPayload }) => {
  if (channel === 'twilio_call_created') {
    const payload = JSON.parse(textPayload) || {}
    if (process.env.DEBUG === '1') {
      console.log('listen notify triggered!')
      console.log('calling endpoint /call from trigger')
    }
    if (process.env.ENABLE_TWILIO_CALL === '1') {
      request.post(`${process.env.APP_DOMAIN}/call`, { form: payload })
    }
  }
})

postgresClient.query(`LISTEN twilio_call_created;`)
