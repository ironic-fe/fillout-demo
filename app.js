require("dotenv").config();

const express = require("express");
const app = express();

const base = "https://api.fillout.com/v1/api/forms";
const port = process.env.PORT || 3001;
const api_key = process.env.API_KEY;
const form_id = process.env.FORM_ID;

const forwardRequest = async (req, res, next) => {
  const response = await fetch(`${base}/${form_id}/submissions`, {
    headers: {
      Authorization: `Bearer ${api_key}`,
    },
  });
  const submissions = await response.json();

  req.submissions = submissions;
  next();
};

app.use(forwardRequest);

app.get("/", (req, res) => {
  res.json(req.submissions);
});

const server = app.listen(port, () =>
  console.log(`Listening on port ${port}!`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
