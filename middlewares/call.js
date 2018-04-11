import twilio from 'twilio'
import { debug } from '../utils'
import * as queries from '../queries'

//
// Endpoint to initialize the twilio call.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.postgresClient {pg/Client} Library `pg` database connection instance.
// @param deps.communityId {Integer} The id of community.
//
export default deps => (req, res) => {
  const { postgresClient, communityId } = deps
  const { id, from: caller } = req.body

  const config = global.TwilioConfigurations[communityId] || {}

  if (!Object.keys(config).length) {
    console.error(`Cannot make a call without Twilio config for community [${communityId}]`)
  }
  else {
    const {
      twilio_account_sid: twilioAccountSid,
      twilio_auth_token: twilioAuthToken,
      twilio_number: twilioNumber
    } = config

    debug(info => info(
      `/community/${communityId}/call ` +
      `{ id: ${id}, from: '${twilioNumber}', to: '${caller}' }`
    ))

    if (!id || !caller) {
      console.error(`Cannot make a call without caller{${caller}} or call id{${id}}.`.red)
      return res.end(JSON.stringify({ status: 'error' }))
    }

    if (process.env.ENABLE_TWILIO_CALL === '1') {
      twilio(twilioAccountSid, twilioAuthToken).calls.create({
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
  }


  res.end(JSON.stringify({ status: 'ok' }))
}
