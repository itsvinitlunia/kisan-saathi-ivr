const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async () => {
  const twiml = new VoiceResponse();
  twiml.dial('+919082497277');
  return {
    statusCode: 200,
    headers: {'Content-Type':'text/xml'},
    body: twiml.toString()
  };
};
