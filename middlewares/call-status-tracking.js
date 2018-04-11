import * as queries from '../queries'
import { debug } from '../utils'

//
// Endpoint to track the Twilio call status transition.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @returns {Function} Express server middleware.
//
export default ({ postgresClient }) => (req, res) => {
  const call = req.body

  debug(info => info('/call-status-tracking Called.'))

  if (call) postgresClient.query(queries.insertTwilioCallTransition(call))
  else console.error('/call-status-tracking Cannot insert an undefined `call` object.')

  res.end(JSON.stringify({ status: 'ok' }))
}
