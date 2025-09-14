const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const Digits = (params.Digits || '').trim();
  const twiml = new VoiceResponse();

  if (Digits === '1') {
    // Ask for farm id via DTMF (digits). Many Farm-IDs numeric; allow up to 6 digits.
    const gather = twiml.gather({
      numDigits: 6,
      action: '/.netlify/functions/farm',
      method: 'POST'
    });
    gather.say('Please enter your Farm ID now, followed by the pound key.');
  } else if (Digits === '2') {
    // Static dummy step as requested
    twiml.say('This is step two, kept as a static dummy only. Thank you.');
  } else if (Digits === '3') {
    // Speech gather for commodity (speech recognition)
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      action: '/.netlify/functions/market?stage=commodity',
      method: 'POST',
      language: 'en-IN'
    });
    gather.say('Please say the commodity you want the market price for after the beep. For example, say tomato.');
  } else if (Digits === '4') {
    // Redirect to expert number
    twiml.dial('+919702120202');
  } else {
    twiml.say('Invalid selection. Goodbye.');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
