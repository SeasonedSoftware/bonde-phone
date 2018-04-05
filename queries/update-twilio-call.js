export default (id, call) => `
UPDATE public.twilio_calls
SET
  twilio_account_sid = '${call.accountSid}',
  twilio_call_sid = '${call.sid}',
  data = '${JSON.stringify(call)}'
WHERE id = ${id};
`
