import { debug } from '../utils'
import * as queries from '../queries'

//
// Endpoint to initialize the twilio call.
//
// @param config {Object} Midlleware configuration object.
// @param config.postgresClient {pg/Client} Library `pg` database connection instance.
// @param config.twilioClient {twilio} Library `twilio` API connection instance.
//
export default ({ twilioClient, postgresClient }) => (req, res) => {
  const { id, from: caller } = req.body

  debug(info => {
    info('endpoint /call entered!')
    info('id', id)
    info('caller', caller)
  })

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

    debug(info => {
      info('call created on the db')
      info('call', call)
    })

    postgresClient.query(queries.updateTwilioCall(id, call))
  })
  .catch(err => console.error('call:catch', err))

  res.end(JSON.stringify({ status: 'ok' }))
}
