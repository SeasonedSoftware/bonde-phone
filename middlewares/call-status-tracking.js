import * as queries from '../queries'

//
// Endpoint to track the twilio call status transition.
//
// @param config {Object} Midlleware configuration object.
// @param config.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
//
export default ({ postgresClient }) => (req, res) => {
  const call = req.body

  if (call) postgresClient.query(queries.insertTwilioCallTransition(call))
}
