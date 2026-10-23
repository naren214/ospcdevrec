const test = require('node:test');
const assert = require('node:assert/strict');
const submit = require('../api/submit');

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(body) { this.body = body; return this; },
    redirect(code, location) { this.statusCode = code; this.location = location; return this; },
    end() { return this; },
  };
}

test('valid JSON signup returns a truthful receipt message', () => {
  const res = response();
  submit({
    method: 'POST', body: { name: 'Review Test', email: 'review@example.com' },
    headers: { 'content-type': 'application/json', accept: 'application/json' },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.match(res.body.message, /received/);
  assert.match(res.body.message, /does not send email alerts/);
});

test('invalid AJAX signup stays an error response', () => {
  const res = response();
  submit({ method: 'POST', body: { name: 'Review Test', email: 'bad' }, headers: { accept: 'application/json' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.ok, false);
});

test('native form submission still receives its redirect', () => {
  const res = response();
  submit({
    method: 'POST', body: { name: 'Review Test', email: 'review@example.com' },
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  }, res);
  assert.equal(res.statusCode, 303);
  assert.equal(res.location, '/join?submitted=1#submitted');
});

test('honeypot AJAX response remains successful without logging a signup', () => {
  const res = response();
  submit({ method: 'POST', body: { 'bot-field': 'filled' }, headers: { accept: 'application/json' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});
