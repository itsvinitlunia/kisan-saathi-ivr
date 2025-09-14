// netlify/functions/handle-selection.js
const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const Digits = (params.Digits || '').trim();
  const callerNumber = params.From;
  const twiml = new VoiceResponse();

  if (!callerNumber) {
    twiml.say('We did not detect your phone number. Goodbye.');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }

  try {
    if (Digits === '1') {
      // Farm ID flow
      const gather = twiml.gather({
        numDigits: 6,
        action: '/.netlify/functions/farm',
        method: 'POST'
      });
      gather.say('Please enter your Farm ID now, followed by the pound key.');
    } else if (Digits === '2') {
      // Static SMS
      twiml.say('Thank you. We will message you the information shortly.');

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const smsBody = `🌱 Kisan Saathi Demo: Soil health tips will be shared soon. Stay tuned!`;

      try {
        const res = await client.messages.create({
          to: callerNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: smsBody
        });
        console.log('Option 2 static SMS sent, sid:', res && res.sid);
      } catch (err) {
        console.error('Option 2 static SMS failed:', err);
      }
    } else if (Digits === '3') {
      // Commodity gather
      const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        action: '/.netlify/functions/market?stage=commodity',
        method: 'POST',
        language: 'en-IN'
      });
      gather.say('Please say the commodity you want the market price for. For example, say tomato.');
    } else if (Digits === '4') {
      // Call transfer
      twiml.say('Please wait while we connect your call.');
      twiml.dial('+919702120202');
    } else {
      twiml.say('Invalid selection. Goodbye.');
    }
  } catch (err) {
    console.error('handle-selection error:', err);
    twiml.say('An error occurred. Goodbye.');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
