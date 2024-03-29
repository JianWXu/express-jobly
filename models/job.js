"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
  /** Create a new job (from data), update job db, return new company data.
   *
   * Data should be {title, salary, equity, company_handle}.
   *
   * Returns {title, salary, equity, company_handle}.
   *
   *Throws BadRequestError if company already in database.
   */

  static async create({ title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
      `SELECT title FROM jobs WHERE title = $1`,
      [title]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate job: ${title}`);
    }

    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ($1, $2, $3, $4) RETURNING title, salary, equity, company_handle`,
      [title, salary, equity, company_handle]
    );

    const job = result.rows[0];

    return job;
  }

  /**Find all companies.
   * Returns [{title, salary, equity, company_handle}]
   */

  static async findAll(param = {}) {
    const { title, minSalary, hasEquity } = param;
    let res = `SELECT title, salary, equity, company_handle FROM jobs`;
    let whereChecks = [];
    let injectionExpressions = [];

    if (title) {
      injectionExpressions.push(`%${title}%`);
      whereChecks.push(`title ILIKE $${injectionExpressions.length}`);
    }

    if (minSalary) {
      injectionExpressions.push(minSalary);
      whereChecks.push(
        `salary IS NOT NULL AND salary >= $${injectionExpressions.length}`
      );
    }

    if (hasEquity === true) {
      injectionExpressions.push(0);
      whereChecks.push(
        `equity IS NOT NULL AND equity > $${injectionExpressions.length}`
      );
    }

    if (whereChecks.length > 0) {
      res += " WHERE " + whereChecks.join(" AND ");
    }

    res += " ORDER BY title";
    const jobsRes = await db.query(res, injectionExpressions);
    return jobsRes.rows;
  }

  static async get(title) {
    const jobRes = await db.query(
      `SELECT title, salary, equity, company_handle FROM jobs WHERE title = $1`,
      [title]
    );
    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job title of: ${title}`);
    return job;
  }

  /** Update job data with "data"
   *
   *
   */
  static async update(jobName, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      title: "title",
      salary: "salary",
      equity: "equity",
      company_handle: "company_handle",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs SET ${setCols} WHERE title = ${handleVarIdx} RETURNING title, salary, equity, company_handle`;
    const result = await db.query(querySql, [...values, jobName]);
    const job = result.rows[0];
    if (!job) {
      throw new NotFoundError(`No job title of: ${jobName}`);
    }
    return job;
  }

  /* Deletes a job with the title input */
  static async remove(title) {
    const result = await db.query(
      `DELETE FROM jobs WHERE title = $1 RETURNING title`,
      [title]
    );
    const job = result.rows[0];
    if (!job) throw new NotFoundError(`No job title of: ${title}`);
  }
}

module.exports = Job;
