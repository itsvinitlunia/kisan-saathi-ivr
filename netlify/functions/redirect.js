// netlify/functions/redirect.js
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async () => {
  const twiml = new VoiceResponse();

  // Announce then dial
  twiml.say('Please wait while we connect your call.');
  twiml.dial('+919702120202');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
