export default call => `
SELECT *
FROM public.twilio_calls
WHERE "from" = '${call.Called}'
ORDER BY id desc
LIMIT 1;
`
