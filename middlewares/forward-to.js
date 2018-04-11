import { twiml } from 'twilio'
import { log } from '../utils'
import * as queries from '../queries'

const VoiceResponse = twiml.VoiceResponse

//
// Endpoint to forward to after the twilio call has finished.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @returns {Function} Express server middleware.
//
export default deps => (req, res) => {
  const { postgresClient } = deps
  const call = req.body

  log.debug('/forward-to Called.')

  postgresClient
    .query(queries.getTwilioCallByCaller(call))
    .then(({ rows: [row] }) => {
      log.debug('Call row', row)

      const response = new VoiceResponse()

      if (row) {
        const dial = response.dial({ callerId: row.from })

        row.to.split(',').forEach(to => {
          dial.number({
            statusCallbackEvent: 'initiated ringing answered completed',
            statusCallback: `${process.env.APP_DOMAIN}/call-status-tracking`,
            statusCallbackMethod: 'POST'
          }, to)
        })

        // maybe a thank you message via Twilio voice, after call has finished?
        res.set('Content-Type', 'text/xml')
        res.send(response.toString())
      } else {
        res.end(JSON.stringify({ status: 'no-data' }))
      }
    })
}
