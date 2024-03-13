require("dotenv").config();

const express = require("express");
const app = express();

const base = "https://api.fillout.com/v1/api/forms";
const port = process.env.PORT || 3001;
const api_key = process.env.API_KEY;
const form_id = process.env.FORM_ID;
const conditions = ["equals", "does_not_equal", "greater_than", "less_than"];

const forwardRequest = async (req, res, next) => {
  queryParams = new URLSearchParams(req.query);
  // Apply offset and limit after filtering results.
  queryParams.delete("offset");
  queryParams.delete("limit");
  const response = await fetch(
    `${base}/${form_id}/submissions?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${api_key}`,
      },
    }
  );
  const submissions = await response.json();
  req.submissions = submissions;

  next();
};

const validateFilter = (filter) => {
  if (!filter.id || !filter.value) {
    return false;
  }
  // If no condition is specified, default to "equals".
  if (!filter.condition) {
    return true;
  }
  return filter.condition && conditions.includes(filter.condition);
};

const runFilter = (submissions, filter) => {
  if (!validateFilter(filter)) {
    return submissions;
  }
  const condition = filter.condition || "equals";
  return submissions.filter((submission) => {
    const source = submission.questions
      .filter((question) => question.id == filter.id)
      .pop();
    if (!source) return false;
    switch (condition) {
      case "equals":
        return source.value == filter.value;
      case "does_not_equal":
        return source.value != filter.value;
      case "greater_than":
        return source.value > filter.value;
      case "less_than":
        return source.value < filter.value;
    }
  });
};

const filterSubmissions = (req, res, next) => {
  if (!req.submissions?.responses.length) {
    next();
  }
  let submissions = req.submissions.responses;

  let filters = req.query.filters || [];
  if (filters.length) {
    // Catch single filters passed as a string and wrap in an array.
    if (!Array.isArray(filters)) {
      filters = [filters];
    }
    filters.forEach((filterString) => {
      filter = JSON.parse(filterString);
      submissions = runFilter(submissions, filter);
    });
  }

  // Apply offset and limit.
  queryParams = new URLSearchParams(req.query);
  if (queryParams.has("offset")) {
    let offset = parseInt(queryParams.get("offset"));
    if (!isNaN(offset) && offset > 0) {
      submissions = submissions.slice(offset);
    }
  }
  if (queryParams.has("limit")) {
    let limit = parseInt(queryParams.get("limit"));
    if (!isNaN(limit) && limit >= 0) {
      submissions = submissions.slice(0, limit);
    }
  }

  // Update submissions.
  req.submissions.responses = submissions;
  req.submissions.totalResponses = submissions.length;

  next();
};

app.use(forwardRequest);
app.use(filterSubmissions);

app.get("/", (req, res) => {
  res.json(req.submissions);
});

const server = app.listen(port);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
