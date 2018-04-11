import * as middlewares from '../middlewares'

//
// Global variable that stores all Twilio configurations.
//
// Example:
// TwilioConfigurations = {
//   '30': anonymous {
//     id: 18,
//     community_id: 30,
//     twilio_account_sid: 'AC________________________________',
//     twilio_auth_token: 'ec______________________________',
//     twilio_number: '+5511________',
//     created_at: 2018-04-11T00:03:11.911Z,
//     updated_at: 2018-04-11T00:03:27.037Z
//   }
// }
//
global.TwilioConfigurations = {}

//
// Factory that fabricates Express endpoints based on Twilio configurations.
//
// @param deps {Object} Dependencies object.
// @param deps.app {express} Express server instance.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @param twilioConfig {Object} Dataset of `twilio_configurations` table.
//
export default (deps, twilioConfig) => {
  const { app, postgresClient } = deps

  const { community_id: communityId } = twilioConfig

  //
  // Add Twilio configuration to global variable.
  //
  global.TwilioConfigurations[communityId] = twilioConfig

  //
  // Community context Express server Twilio call endpoint bootstrap.
  //
  app.post(
    `/community/${communityId}/call`,
    middlewares.call({ postgresClient, communityId })
  )

  console.info(` - Exposed: /community/${communityId}/call`.cyan)
}
