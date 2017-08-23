require('dotenv').config()

import http from 'http'
import request from 'request'
import express from 'express'
import bodyParser from 'body-parser'
import twilio, { twiml } from 'twilio'
import { Client as PostgresClient } from 'pg'

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
// TODO: integrate GraphQL Apollo Client
// TODO: make the code more readable
//
app.post('/call-status-tracking', (req, res) => {
  if (req.body) {
    const call = req.body
    // TODO: pass to a postgraphql function
    postgresClient.query(`insert into public.twilio_call_transitions (twilio_account_sid, twilio_call_sid, twilio_parent_call_sid, sequence_number, status, caller, called, call_duration, data, created_at, updated_at) values ('${call.AccountSid}', '${call.CallSid}', ${call.ParentCallSid ? '\'' + call.ParentCallSid + '\'' : 'null'}, ${call.SequenceNumber}, '${call.CallStatus}', '${call.Caller}', '${call.Called}', ${call.CallDuration || 'null'}, '${JSON.stringify(call)}', now(), now());`)
  }
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
    // TODO: pass to a postgraphql function
    if (process.env.DEBUG === '1') {
      console.log('call created on the db')
      console.log('call', call)
    }
    postgresClient.query(`update public.twilio_calls set twilio_account_sid = '${call.accountSid}', twilio_call_sid = '${call.sid}', data = '${JSON.stringify(call)}' where id = ${id};`)
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
    // TODO: pass to a postgraphql view
    .query(`select * from public.twilio_calls where "from" = '${call.Called}' order by id desc limit 1`)
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
postgresClient.connect(err => {
  if (err) console.error('connection error', err.stack)

  const triggers = ['twilio_call_created']

  console.info('2. PosgreSQL client connected and watching notifications')
  triggers.forEach(trigger => console.info(`  - ${trigger}`))
  console.info()

  postgresClient.on('notification', ({ channel, payload: textPayload }) => {
    if (channel === 'twilio_call_created') {
      const payload = JSON.parse(textPayload) || {}
      if (process.env.DEBUG === '1') {
        console.log('listen notify triggered!')
      }
      // request.post(`${process.env.APP_DOMAIN}/call`, { form: payload })
    }
  })

  triggers.forEach(trigger => {
    postgresClient.query(`LISTEN ${trigger}`)
  })
})
