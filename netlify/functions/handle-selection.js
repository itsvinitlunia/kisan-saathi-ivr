const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const Digits = (params.Digits || '').trim();
  const callerNumber = params.From;   // caller's phone
  const twiml = new VoiceResponse();

  if (Digits === '1') {
    // Ask for farm id
    const gather = twiml.gather({
      numDigits: 6,
      action: '/.netlify/functions/farm',
      method: 'POST'
    });
    gather.say('Please enter your Farm ID now, followed by the pound key.');
  } else if (Digits === '2') {
    // Static dummy with SMS
    twiml.say('Thank you. We will message you the information shortly.');

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: "Kisan Saathi Demo: This is a static SMS message for option 2. Soil analysis data will be provided in future."
      });
    } catch (err) {
      console.error("Error sending static SMS:", err);
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
    gather.say('Please say the commodity you want the market price for after the beep. For example, say tomato.');
  } else if (Digits === '4') {
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
