import twilio from 'twilio'
import { log } from '../utils'
import * as queries from '../queries'

//
// Endpoint to initialize the twilio call.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.postgresClient {pg/Client} Library `pg` database connection instance.
// @param deps.communityId {Integer} The id of community.
// @returns {Function} Express server middleware.
//
export default deps => (req, res) => {
  const { postgresClient, communityId } = deps
  const { id, from: caller } = req.body

  const config = global.TwilioConfigurations[communityId] || {}

  log.debug(`/community/${communityId}/call Called.`)

  if (!Object.keys(config).length) {
    log.error(`Cannot make a call without Twilio config for community [${communityId}]`)
  }

  else if (!id || !caller) {
    log.error(`Cannot make a call without caller{${caller}} or call id{${id}}.`.red)
  }

  else if (process.env.ENABLE_TWILIO_CALL !== '1') {
    log.debug(
      `/community/${communityId}/call ` +
      `Data { id: ${id}, from: '${config.twilio_number}', to: '${caller}' }`
    )
    log.debug(
      `/community/${communityId}/call Supressed Twilio call. ` +
      'Enable the `ENABLE_TWILIO_CALL` environment variable to proceed.'
    )
    log.success(`Call initiated from ${config.twilio_number} to ${caller}. (${id})`)
  }

  else {
    const {
      twilio_account_sid: twilioAccountSid,
      twilio_auth_token: twilioAuthToken,
      twilio_number: twilioNumber
    } = config

    log.debug(
      `/community/${communityId}/call ` +
      `Data { id: ${id}, from: '${twilioNumber}', to: '${caller}' }`
    )

    //
    // Connect to Twilio API to proceed the call.
    //
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
      log.success(`Call initiated from ${twilioNumber} to ${caller}. (${id})`)

      delete call._version
      postgresClient.query(queries.updateTwilioCall(id, call))
    })
    .catch(err => log.error('call:catch', err))
  }

  res.end(JSON.stringify({ status: 'ok' }))
}
