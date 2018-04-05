//
// Endpoint to check the health of the application.
//
export default () => (req, res) => {
  return res.end(JSON.stringify({ status: 'ok' }))
}
