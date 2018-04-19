//
// Postgres listen notify channel listeners initialization.
//
// @param deps {Object} Dependencies object.
// @param deps.postgresClient {pg/Client} Postgres `pg` lib client database connection instance.
// @returns {Void}
//
export default deps => {
  const { postgresClient } = deps

  postgresClient.query(`LISTEN twilio_call_created;`)
  postgresClient.query(`LISTEN twilio_configuration_created;`)
  postgresClient.query(`LISTEN twilio_configuration_updated;`)
}
