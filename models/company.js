"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   * Can filter on provided search filters:
   * -minEmployees
   * -maxEmployees
   * -nameLike( will find case-insensitive and partial matches)
   *
   * throw error when minEmployees is greater than maxEmployees
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(param = {}) {
    const { name, minEmployee, maxEmployee } = param;
    let res = `SELECT handle,
    name,
    description,
    num_employees AS "numEmployees",
    logo_url AS "logoUrl"
FROM companies`;
    let whereChecks = [];
    let injectionExpressions = [];

    if (minEmployee > maxEmployee) {
      throw new BadRequestError(
        "Maximum employee has to be greater than minimum employee"
      );
    }

    if (minEmployee !== undefined) {
      injectionExpressions.push(minEmployee);
      whereChecks.push(`num_employees >=$${injectionExpressions.length}`);
    }

    if (maxEmployee !== undefined) {
      injectionExpressions.push(maxEmployee);
      whereChecks.push(`num_employees <=$${injectionExpressions.length}`);
    }

    if (name) {
      injectionExpressions.push(`%${name}%`);
      whereChecks.push(`name ILIKE $${injectionExpressions.length}`);
    }

    if (whereChecks.length > 0) {
      res += " WHERE " + whereChecks.join(" AND ");
    }

    res += " ORDER BY name";
    const companiesRes = await db.query(res, injectionExpressions);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    let arr = [];
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    arr.push(company);

    const companyJobsRes = await db.query(
      `SELECT id, title, salary, equity FROM jobs INNER JOIN companies ON company_handle=$1`,
      [handle]
    );

    const jobs = companyJobsRes.rows;

    arr.push(jobs);

    if (arr[1].length === 0) {
      arr.pop();
    }

    return arr;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
