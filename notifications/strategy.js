import request from 'request'
import { log } from '../utils'
import * as factories from '../factories'

//
// Postgres listen notify channel action strategy.
//
// @param deps {Object} Notifications dependencies object.
// @param deps.app {express} Express server instance.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @returns {Function} Postgres `notification` event function.
//
export default deps => ({ channel, payload: textPayload }) => {
  const { app, postgresClient } = deps

  const payload = JSON.parse(textPayload) || {}

  log.debug(`Notification received from: ${channel}[${payload.id}]`)

  switch (channel) {
    case 'twilio_call_created':
      request.post(
        `${process.env.APP_DOMAIN}/community/${payload.community_id}/call`,
        { form: payload }
      )
    break;

    case 'twilio_configuration_created':
      factories.twilioConfiguration({ app, postgresClient }, payload)
      break;

    case 'twilio_configuration_updated':
      factories.twilioConfiguration({ app, postgresClient }, payload, true)
    break;
  }
}
