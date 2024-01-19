"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobSearchSchema = require("../schemas/jobSearch.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/* POST /jobs 

job should be {title, salary, equity, company_handle}

returns {title, salary, equity, company_handle}

authorization required: login and admin
*/

router.post("/", ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const err = validator.errors.map((e) => e.stack);
      throw new BadRequestError(err);
    }
    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/* GET /jobs
 */

router.get("/", async function (req, res, next) {
  const params = req.query;
  if (params.salary !== undefined) {
    params.salary = +params.salary;
  }
  try {
    const validator = jsonschema.validate(params, jobSearchSchema);
    if (!validator.valid) {
      const err = validator.errors.map((e) => e.stack);
      throw new BadRequestError(err);
    }
    const jobs = await Job.findAll(params);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle] => {job}
 *
 * Job is {title, salary, equity, company_handle}
 *
 * Authorization require: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.handle);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] {param1, param2, ...} => {job}
 *
 * Patches job data.
 *
 * fields can be: {title, salary, equity, company_handle}
 *
 * Returns: {title, salary, equity, company_handle}
 *
 * Authorization required: login and admin
 */

router.patch("/:handle", ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.handle, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/* DELETE /[handle] => {deleted: handle}

  Authorization: login and admin
*/
router.delete("/:handle", ensureIsAdmin, async function (req, res, next) {
  try {
    await job.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
