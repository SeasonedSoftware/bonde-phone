import request from 'request'
import { debug } from '../utils'
import * as factories from '../factories'

//
// Postgres listen notify channel action strategy.
//
// @param deps {Object} Notifications dependencies object.
// @param deps.app {express} Express server instance.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
//
export default deps => ({ channel, payload: textPayload }) => {
  const { app, postgresClient } = deps

  const payload = JSON.parse(textPayload) || {}

  switch (channel) {
    case 'twilio_call_created':
      debug(info => info(
        `Notification received from: twilio_call_created[${payload.id}]`
      ))
      request.post(
        `${process.env.APP_DOMAIN}/community/${payload.community_id}/call`,
        { form: payload }
      )
    break;

    case 'twilio_configuration_created':
      debug(info => info(
        `Notification received from: twilio_configuration_created[${payload.id}]`
      ))
      factories.twilioConfiguration({ app, postgresClient }, payload)
    break;
  }
}
