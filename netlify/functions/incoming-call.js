const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async (event) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/.netlify/functions/handle-selection',
    method: 'POST'
  });

  gather.say('Welcome to Kisan Saathi. Press 1 for Farm Nutrient report. Press 2 for Soil analysis demo. Press 3 for Market prices. Press 4 to speak to an expert.');

  // if no input:
  twiml.say('We did not receive your selection. Goodbye.');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
