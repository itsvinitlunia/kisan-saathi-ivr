const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const nutrients = require('../../data/nutrients.json'); // adjust path if needed

exports.handler = async (event) => {
  const params = qs.parse(event.body || '');
  const { Digits, From: callerNumber } = params;
  const twiml = new VoiceResponse();

  if (!Digits || !callerNumber) {
    twiml.say('Did not receive Farm ID or caller information. Goodbye.');
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
  }

  const farmId = parseInt(Digits, 10);
  const record = nutrients.find(r => Number(r['Farm-ID']) === farmId);

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  if (!record) {
    twiml.say(`We could not find Farm ID ${farmId}. We will send you a notification by SMS.`);
    try {
      await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Kisan Saathi: Farm ID ${farmId} not found in our records. Please verify and try again.`
      });
    } catch (err) {
      console.error("Farm SMS send failed:", err);
    }
  } else {
    const fmt = (v) => (typeof v === 'number' ? v.toFixed(4) : String(v));
    const messageLines = [
      `🌱 Kisan Saathi — Farm Nutrient Report`,
      `Farm ID: ${record['Farm-ID']}`,
      '',
      `Nitrogen → High: ${fmt(record['Nitrogen - High'])}, Medium: ${fmt(record['Nitrogen - Medium'])}, Low: ${fmt(record['Nitrogen - Low'])}`,
      `Phosphorous → High: ${fmt(record['Phosphorous - High'])}, Medium: ${fmt(record['Phosphorous - Medium'])}, Low: ${fmt(record['Phosphorous - Low'])}`,
      `Potassium → High: ${fmt(record['Potassium - High'])}, Medium: ${fmt(record['Potassium - Medium'])}, Low: ${fmt(record['Potassium - Low'])}`,
      `pH → Acidic: ${fmt(record['pH - Acidic'])}, Neutral: ${fmt(record['pH - Neutral'])}, Alkaline: ${fmt(record['pH - Alkaline'])}`,
      '',
      `This is an automated SMS from Kisan Saathi.`
    ];
    const body = messageLines.join('\n');

    try {
      await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body
      });
    } catch (err) {
      console.error("Farm SMS send failed:", err);
    }

    twiml.say('Thank you. We will send the nutrient details to your phone shortly.');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
