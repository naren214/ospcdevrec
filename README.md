# OSPC Dev Recruitment Site

Static pages for the recruitment project, with a Vercel serverless signup endpoint at `api/submit.js`.

## Signup behavior

The endpoint validates each submission and logs accepted signups to its server logs. It does not save them to a database or send email alerts, so the form confirms receipt without promising future messages. The form keeps the user's entries available if the request fails.

## Local preview and checks

Serve the repository root with a local static web server and open `join.html`. The serverless endpoint requires a Vercel-compatible runtime. Run its local contract checks with `node --test tests/*.test.cjs`.
