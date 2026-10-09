/**
 * Vercel Serverless Function — Fan Roster Submission Handler
 * Handles fan list signups with validation, honeypot protection,
 * and seamless fallback support for progressive enhancement.
 */

module.exports = (req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed. Please submit via POST.'
    });
  }

  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const favVideo = body['favourite-video'] || body.video || '';
    const suggestion = (body.suggestion || '').trim();
    const botField = body['bot-field'] || body.botField || '';

    // Honeypot spam detection
    if (botField) {
      // Quietly return success to thwart bots
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.redirect(303, '/join?submitted=1');
      }
      return res.status(200).json({ ok: true, message: 'Submission logged.' });
    }

    // Required fields check
    if (!name || !email) {
      return res.status(400).json({
        ok: false,
        error: 'Name and email are required fields.'
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: 'Please provide a valid email address.'
      });
    }

    // Log the signup on the server
    console.log(`[Fan Signup] ${name} <${email}> | Fav: "${favVideo}" | Suggestion: "${suggestion.slice(0, 60)}"`);

    // Handle traditional form POST redirect for non-JS browsers
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      return res.redirect(303, '/join?submitted=1');
    }

    // Return JSON response for AJAX / fetch submissions
    return res.status(200).json({
      ok: true,
      message: 'You are officially on the list! We will notify you whenever Jack drops an ambitious new video experiment.'
    });
  } catch (err) {
    console.error('[Fan Signup Error]', err);
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred while processing your request.'
    });
  }
};
