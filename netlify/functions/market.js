const qs = require('querystring');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const marketData = require('../../data/market_price.json');

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  const stage = (query.stage || '').toLowerCase();
  const clientParams = qs.parse(event.body || '');
  const callerNumber = clientParams.From;
  const twiml = new VoiceResponse();
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  if (stage === 'commodity') {
    // Received commodity (SpeechResult)
    const commodity = (clientParams.SpeechResult || '').trim();
    if (!commodity) {
      twiml.say('I did not catch the commodity. Goodbye.');
      return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
    }

    // Ask for district
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      action: `/.netlify/functions/market?stage=district&commodity=${encodeURIComponent(commodity)}`,
      method: 'POST',
      language: 'en-IN'
    });
    gather.say(`You said ${commodity}. Now please say the district name.`);
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
  }

  if (stage === 'district') {
    const commodity = (query.commodity || '').trim();
    const district = (clientParams.SpeechResult || '').trim();
    if (!commodity || !district) {
      twiml.say('Missing commodity or district. Goodbye.');
      return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
    }

    // Find matches — case insensitive substring match, prioritized exact matches
    const cLower = commodity.toLowerCase();
    const dLower = district.toLowerCase();

    let matches = marketData.filter(item =>
      (item.commodity || '').toLowerCase().includes(cLower) &&
      (item.district || '').toLowerCase().includes(dLower)
    );

    // If no direct matches, try matching commodity only
    if (matches.length === 0) {
      matches = marketData.filter(item =>
        (item.commodity || '').toLowerCase().includes(cLower)
      );
    }

    if (matches.length === 0) {
      twiml.say(`Sorry, we could not find market prices for ${commodity} in ${district}. We will send you a message.`);
      await client.messages.create({
        to: callerNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Kisan Saathi: No market price data found for "${commodity}" in "${district}".`
      });
      return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
    }

    // Format SMS with all matched rows
    const lines = [`Kisan Saathi — Market Price Results for ${commodity} in ${district}`];
    matches.slice(0, 5).forEach((m, i) => {
      lines.push('');
      lines.push(`${i+1}. ${m.commodity} — ${m.market}, ${m.district}, ${m.state}`);
      if (m.variety) lines.push(`Variety: ${m.variety} | Grade: ${m.grade || '-'}`);
      if (m.arrival_date) lines.push(`Arrival Date: ${m.arrival_date}`);
      lines.push(`Min: ₹${m.min_price} | Max: ₹${m.max_price} | Modal: ₹${m.modal_price}`);
    });
    lines.push('');
    lines.push('This is an automated message from Kisan Saathi.');

    const body = lines.join('\n');

    // send SMS
    await client.messages.create({
      to: callerNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body
    });

    twiml.say('Thank you. We will send market price details to your phone shortly.');
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
  }

  // default
  twiml.say('Unexpected request to market function. Goodbye.');
  return { statusCode:200, headers:{'Content-Type':'text/xml'}, body: twiml.toString() };
};
