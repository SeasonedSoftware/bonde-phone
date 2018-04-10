import twilio from 'twilio'
import * as middlewares from '../middlewares'

//
// Factory that fabricates Express endpoints based on Twilio configurations.
//
// @param deps {Object} Notifications dependencies object.
// @param deps.app {express} Express server instance.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @param config {Object} Twilio configuration table row data.
//
export default (deps, config) => {
  const { app, postgresClient } = deps

  const { community_id: id } = config
  //
  // Twilio client setup.
  //
  const twilioClient = twilio(
    config.twilio_account_sid,
    config.twilio_auth_token
  )

  //
  // Express server endpoints setup.
  //
  app.post(
    `/community/${id}/call`,
    middlewares.call({ twilioClient, postgresClient, config })
  )

  console.info(` - Exposed: /community/${id}/call`.cyan)
}
