import 'colors'

const j = array => array.join(' ')

export default {
  debug:   (...msg) => process.env.DEBUG === '1' && console.log(`[DEBUG] ${j(msg)}`.grey),
  info:    (...msg) => console.log(`[INFO] ${j(msg)}`),
  notice:  (...msg) => console.log(`[NOTICE] ${j(msg)}`.cyan),
  warning: (...msg) => console.log(`[WARNING] ${j(msg)}`.yellow),
  success: (...msg) => console.log(`[SUCCESS] ${j(msg)}`.green),
  error:   (...msg) => console.log(`[ERROR] ${j(msg)}`.red),
  item:    (...msg) => console.log(` - ${j(msg)}`.cyan)
}
