import * as queries from '../queries'

//
// Endpoint to forward to after the twilio call has finished.
//
// @param config {Object} Midlleware configuration object.
// @param config.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
//
export default ({ postgresClient }) => (req, res) => {
  const call = req.body

  if (process.env.DEBUG === '1') {
    console.log('endpoint /forward-to reached!')
  }

  postgresClient
    .query(queries.getTwilioCallByCaller(call))
    .then(({ rows: [row] }) => {
      if (process.env.DEBUG === '1') {
        console.log('call row', row)
      }

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
