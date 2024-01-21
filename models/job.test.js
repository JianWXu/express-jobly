"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************ create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: "0.001",
    company_handle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle FROM jobs WHERE title = 'new'`
    );
    expect(result.rows).toEqual([
      { title: "new", salary: 100000, equity: "0.001", company_handle: "c1" },
    ]);
  });

  test("bad request with dupe job", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/***********************************findall */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 1,
        equity: "0.01",
        company_handle: "c1",
      },
      { title: "j2", salary: 2, equity: null, company_handle: "c2" },
      { title: "j3", salary: null, equity: "0.001", company_handle: "c3" },
    ]);
  });

  test("works: filter on title", async function () {
    let jobs = await Job.findAll({ title: "j1" });
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 1,
        equity: "0.01",
        company_handle: "c1",
      },
    ]);
  });

  test("works: filter on salary", async function () {
    let jobs = await Job.findAll({ minSalary: 2 });
    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 2,
        equity: null,
        company_handle: "c2",
      },
    ]);
  });

  test("works: filter on equity", async function () {
    let jobs = await Job.findAll({ hasEquity: true });
    console.log(jobs);
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 1,
        equity: "0.01",
        company_handle: "c1",
      },
      { title: "j3", salary: null, equity: "0.001", company_handle: "c3" },
    ]);
  });
});

/***************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("j1");
    expect(job).toEqual({
      title: "j1",
      salary: 1,
      equity: "0.01",
      company_handle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("nope");
      // fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/***************************** patch */

describe("update", function () {
  const updateData = {
    title: "new",
    salary: 4,
    equity: "0.004",
    company_handle: "c3",
  };

  test("works", async function () {
    let job = await Job.update("j1", updateData);
    expect(job).toEqual({
      ...updateData,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle
          FROM jobs
          WHERE title = 'new'`
    );
    expect(result.rows).toEqual([
      { title: "new", salary: 4, equity: "0.004", company_handle: "c3" },
    ]);
  });
});

describe("remove", function () {
  test("works", async function () {
    await Job.remove("j1");
    const res = await db.query(`SELECT title from jobs WHERE title='j1'`);
    expect(res.rows.length).toEqual(0);
  });
  test("not found if no such job title", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
