//
// Endpoint to check the health of the application.
// @returns {Function} Express server middleware.
//
export default () => (req, res) => {
  return res.end(JSON.stringify({ status: 'ok' }))
}
