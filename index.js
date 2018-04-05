require('dotenv').config()

import http from 'http'
import request from 'request'
import express from 'express'
import bodyParser from 'body-parser'
import twilio, { twiml } from 'twilio'
import { Client as PostgresClient } from 'pg'

import * as queries from './queries'

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
// PostgreSQL client configuration
//
const postgresClient = new PostgresClient({ connectionString: process.env.DATABASE_URL })

//
// Express server endpoints
// TODO: refact the endpoints into a route file
//
app.post('/call-status-tracking', (req, res) => {
  const call = req.body

  if (call) {
    postgresClient.query(queries.insertTwilioCallTransition(call))
  }
})

app.get('/ping', (req, res) => {
  return res.end(JSON.stringify({ status: 'ok' }))
})

app.post('/call', (req, res) => {
  const { id, from: caller } = req.body

  if (process.env.DEBUG === '1') {
    console.log('endpoint /call entered!')
    console.log('id', id)
    console.log('caller', caller)
  }

  if (!id || !caller) {
    return res.end(JSON.stringify({ status: 'error' }))
  }

  twilioClient.calls.create({
    url: `${process.env.APP_DOMAIN}/forward-to`,
    to: caller,
    from: process.env.TWILIO_NUMBER,
    method: 'POST',
    statusCallback: `${process.env.APP_DOMAIN}/call-status-tracking`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  })
  .then(call => {
    delete call._version

    if (process.env.DEBUG === '1') {
      console.log('call created on the db')
      console.log('call', call)
    }

    postgresClient.query(queries.updateTwilioCall(id, call))
  })
  .catch(err => console.error('call:catch', err))

  res.end(JSON.stringify({ status: 'ok' }))
})

app.post('/forward-to', (req, res) => {
  const call = req.body
  if (process.env.DEBUG === '1') {
    console.log('endpoint /forward-to reached!')
  }

  postgresClient
    .query(queries.getTwilioCallByCaller(call))
    .then(({ rows: [row] }) => {
      const response = new VoiceResponse()
      if (process.env.DEBUG === '1') {
        console.log('call row', row)
      }

      if (row) {
        const dial = response.dial({ callerId: row.from })
        row.to.split(',').forEach(to => {
          dial.number({
            statusCallbackEvent: 'initiated ringing answered completed',
            statusCallback: `${process.env.APP_DOMAIN}/call-status-tracking`,
            statusCallbackMethod: 'POST'
          }, to)
        })
        // maybe a thank you message?
        res.set('Content-Type', 'text/xml')
        res.send(response.toString())
      } else {
        res.end(JSON.stringify({ status: 'no-data' }))
      }
    })
})

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
