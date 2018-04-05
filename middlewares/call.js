import { debug } from '../utils'
import * as queries from '../queries'

//
// Endpoint to initialize the twilio call.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.twilioClient {twilio} Library `twilio` API connection instance.
// @param deps.postgresClient {pg/Client} Library `pg` database connection instance.
// @param deps.config {Object} Row of `twilio_configurations` object.
//
export default ({ twilioClient, postgresClient, config }) => (req, res) => {
  const { id, from: caller } = req.body
  const { twilio_number: twilioNumber, community_id: communityId } = config

  const endpoint = `/community/${communityId}/call`
  debug(info => info(`${endpoint} { id: ${id}, from: '${twilioNumber}', to: '${caller}' }`))

  if (!id || !caller) {
    return res.end(JSON.stringify({ status: 'error' }))
  }

  if (process.env.ENABLE_TWILIO_CALL === '1') {
    twilioClient.calls.create({
      url: `${process.env.APP_DOMAIN}/forward-to`,
      to: caller,
      from: twilioNumber,
      method: 'POST',
      statusCallback: `${process.env.APP_DOMAIN}/call-status-tracking`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    })
    .then(call => {
      delete call._version
      debug(info => info(`Call [${id}] initiated. ${call}`))

      postgresClient.query(queries.updateTwilioCall(id, call))
    })
    .catch(err => console.error('call:catch', err))
  }
  else debug(info => info('Supressed Twilio call. Enable the `ENABLE_TWILIO_CALL` env var.'))

  res.end(JSON.stringify({ status: 'ok' }))
}
