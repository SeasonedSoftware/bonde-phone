import * as queries from '../queries'

//
// Endpoint to track the twilio call status transition.
//
// @param deps {Object} Midlleware dependencies object.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
//
export default ({ postgresClient }) => (req, res) => {
  const call = req.body

  if (call) postgresClient.query(queries.insertTwilioCallTransition(call))
}
