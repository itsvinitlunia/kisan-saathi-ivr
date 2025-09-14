// netlify/functions/farm.js
const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const nutrients = require('../../data/nutrients.json'); // adjust if path differs

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const { Digits, From: callerNumber } = params;
  const twiml = new VoiceResponse();

  // Debug logs
  console.log("DEBUG - Incoming params:", params);
  console.log("DEBUG - callerNumber detected:", callerNumber);

  if (!Digits || !callerNumber) {
    twiml.say('Did not receive Farm ID or caller information. Goodbye.');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }

  const farmId = parseInt(Digits, 10);
  const record = nutrients.find(r => Number(r['Farm-ID']) === farmId);

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  if (!record) {
    twiml.say(`We could not find Farm ID ${farmId}. We will send you a notification by SMS.`);
    try {
      console.log("DEBUG - Sending 'farm not found' SMS to:", callerNumber);
      const res = await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `🌱 Kisan Saathi: Farm ID ${farmId} not found. Please verify and try again.`
      });
      console.log("DEBUG - SMS SID:", res && res.sid);
      twiml.say('A notification has been sent to your phone.');
    } catch (err) {
      console.error('Farm SMS send failed (not-found):', err);
      twiml.say('We attempted to send an SMS but failed. Please check your number or try again later.');
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }

  // ✅ Shortened trial-safe message (<160 chars)
  const body =
    `🌱 KisanSaathi Farm ${record['Farm-ID']} | ` +
    `N: H=${record['Nitrogen - High']},M=${record['Nitrogen - Medium']},L=${record['Nitrogen - Low']} | ` +
    `P: H=${record['Phosphorous - High']},M=${record['Phosphorous - Medium']},L=${record['Phosphorous - Low']} | ` +
    `K: H=${record['Potassium - High']},M=${record['Potassium - Medium']},L=${record['Potassium - Low']} | ` +
    `pH: A=${record['pH - Acidic']},N=${record['pH - Neutral']},Alk=${record['pH - Alkaline']}`;

  try {
    console.log("DEBUG - Sending SMS to:", callerNumber, "from:", process.env.TWILIO_PHONE_NUMBER);
    const res = await client.messages.create({
      to: callerNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body
    });
    console.log("DEBUG - SMS SID:", res && res.sid);
    twiml.say('Thank you. We have sent the nutrient details to your phone.');
  } catch (err) {
    console.error('Farm SMS send failed:', err);
    twiml.say('We attempted to send the nutrient details but failed. Please verify your number or try again later.');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
