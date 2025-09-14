// netlify/functions/market.js
const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const marketData = require('../../data/market_price.json'); // adjust path if needed

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const stage = (query.stage || '').toLowerCase();
  const params = qs.parse(event.body || '');
  const callerNumber = params.From;
  const twiml = new VoiceResponse();
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  if (stage === 'commodity') {
    const commodity = (params.SpeechResult || '').trim();
    if (!commodity) {
      twiml.say('I did not catch the commodity. Goodbye.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    }

    // Ask for district via speech
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      action: `/.netlify/functions/market?stage=district&commodity=${encodeURIComponent(commodity)}`,
      method: 'POST',
      language: 'en-IN'
    });
    gather.say(`You said ${commodity}. Now please say the district name.`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }

  if (stage === 'district') {
    const commodity = (query.commodity || '').trim();
    const district = (params.SpeechResult || '').trim();

    if (!commodity || !district) {
      twiml.say('Missing commodity or district. Goodbye.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    }

    const cLower = commodity.toLowerCase();
    const dLower = district.toLowerCase();

    let matches = marketData.filter(item =>
      (item.commodity || '').toLowerCase().includes(cLower) &&
      (item.district || '').toLowerCase().includes(dLower)
    );

    if (matches.length === 0) {
      matches = marketData.filter(item =>
        (item.commodity || '').toLowerCase().includes(cLower)
      );
    }

    if (matches.length === 0) {
      twiml.say(`Sorry, we could not find market prices for ${commodity} in ${district}. We will send you a message.`);
      try {
        const res = await client.messages.create({
          to: callerNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: `📊 Kisan Saathi: No market price data found for "${commodity}" in "${district}".`
        });
        console.log('Market not found SMS sent, sid:', res && res.sid);
      } catch (err) {
        console.error('Market (not-found) SMS failed:', err);
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
      };
    }

    const lines = [`📊 Kisan Saathi — Market Price Results for ${commodity} in ${district}`];
    matches.slice(0, 5).forEach((m, i) => {
      lines.push('');
      lines.push(`${i + 1}. ${m.commodity} — ${m.market || '-'}, ${m.district || '-'}, ${m.state || '-'}`);
      if (m.variety) lines.push(`Variety: ${m.variety} | Grade: ${m.grade || '-'}`);
      if (m.arrival_date) lines.push(`Arrival Date: ${m.arrival_date}`);
      lines.push(`Min: ₹${m.min_price || '-'} | Max: ₹${m.max_price || '-'} | Modal: ₹${m.modal_price || '-'}`);
    });
    lines.push('');
    lines.push('This is an automated SMS from Kisan Saathi.');

    const body = lines.join('\n');

    try {
      const res = await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body
      });
      console.log('Market SMS sent, sid:', res && res.sid);
      twiml.say('Thank you. We have sent market price details to your phone.');
    } catch (err) {
      console.error('Market SMS send failed:', err);
      twiml.say('We attempted to send market price details but failed. Please check your number or try again later.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml.toString()
    };
  }

  twiml.say('Unexpected request to market function. Goodbye.');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml.toString()
  };
};
