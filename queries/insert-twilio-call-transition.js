export default call => `
INSERT INTO public.twilio_call_transitions (
  twilio_account_sid,
  twilio_call_sid,
  twilio_parent_call_sid,
  sequence_number,
  status,
  caller,
  called,
  call_duration,
  data,
  created_at,
  updated_at
)
values (
  '${call.AccountSid}',
  '${call.CallSid}',
  ${call.ParentCallSid ? '\'' + call.ParentCallSid + '\'' : 'null'},
  ${call.SequenceNumber},
  '${call.CallStatus}',
  '${call.Caller}',
  '${call.Called}',
  ${call.CallDuration || 'null'},
  '${JSON.stringify(call)}',
  NOW(),
  NOW()
);
`
