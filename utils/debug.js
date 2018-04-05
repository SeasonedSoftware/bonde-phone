import 'colors'

const info = (...message) => {
  console.info(`[DEBUG] ${message.join(' ')}`.blue)
}

//
// Function that verify if the application is on `debug` mode
// and call the received logs function.
//
// @param logs {Function} Function that will be called when the application is on `debug` mode.
//
export default logs => {
  if (process.env.DEBUG === '1') logs(info)
}
