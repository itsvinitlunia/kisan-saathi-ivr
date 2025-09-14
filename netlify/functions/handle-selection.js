// netlify/functions/handle-selection.js
const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const Digits = (params.Digits || '').trim();
  const callerNumber = params.From;
  const twiml = new VoiceResponse();

  // safety: if no caller number, return an XML telling user we couldn't proceed
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
      // Ask for farm id via DTMF
      const gather = twiml.gather({
        numDigits: 6,
        action: '/.netlify/functions/farm',
        method: 'POST'
      });
      gather.say('Please enter your Farm ID now, followed by the pound key.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    } else if (Digits === '2') {
      // Static SMS immediately
      twiml.say('Thank you. We will message you the information shortly.');

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const smsBody = `🌱 Kisan Saathi — Demo Message
This is a static demo SMS for Option 2. Soil analysis data will be provided in future.`;

      try {
        const result = await client.messages.create({
          to: callerNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: smsBody
        });
        // log success
        console.log('Option 2 static SMS sent, sid:', result && result.sid);
      } catch (err) {
        console.error('Option 2 static SMS failed:', err);
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    } else if (Digits === '3') {
      // Speech gather for commodity
      const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        action: '/.netlify/functions/market?stage=commodity',
        method: 'POST',
        language: 'en-IN'
      });
      gather.say('Please say the commodity you want the market price for after the beep. For example: tomato.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    } else if (Digits === '4') {
      // Redirect / dial to expert
      twiml.dial('+919702120202');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    } else {
      twiml.say('Invalid selection. Goodbye.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    }
  } catch (err) {
    console.error('handle-selection error:', err);
    twiml.say('An error occurred. Goodbye.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }
};
