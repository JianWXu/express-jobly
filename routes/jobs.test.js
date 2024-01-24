"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");
const { ensureIsAdmin } = require("../middleware/auth");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  u1Token,
  u2Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/***************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: "0.001",
    company_handle: "c1",
  };

  test("ok for users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({ title: "new-job", salary: 1000 })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "newJob",
        salary: 1000,
        equity: 1.2,
        company_handle: "c1",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs WITHOUT filter*/

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        { title: "j1", salary: 1, equity: "0.01", company_handle: "c1" },
        {
          title: "j2",
          salary: 2,
          equity: null,
          company_handle: "c3",
        },
        {
          title: "j3",
          salary: null,
          equity: "0.03",
          company_handle: "c3",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs WITH filter*/

describe("GET /jobs", function () {
  test("ok with title filter", async function () {
    const resp = await request(app).get("/jobs?title=j1");
    expect(resp.body).toEqual({
      jobs: [{ title: "j1", salary: 1, equity: "0.01", company_handle: "c1" }],
    });
  });

  test("ok with salary filter", async function () {
    const resp = await request(app).get("/jobs?minSalary=2");
    expect(resp.body).toEqual({
      jobs: [{ title: "j2", salary: 2, equity: null, company_handle: "c3" }],
    });
  });

  test("ok with equity filter", async function () {
    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        { title: "j1", salary: 1, equity: "0.01", company_handle: "c1" },
        {
          title: "j3",
          salary: null,
          equity: "0.03",
          company_handle: "c3",
        },
      ],
    });
  });
});

/************************************** GET /jobs/:handle */

describe("GET /jobs/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get("/jobs/j1");
    expect(resp.body).toEqual({
      job: { title: "j1", salary: 1, equity: "0.01", company_handle: "c1" },
    });
  });

  test("not found for non-existing job", async function () {
    const resp = await request(app).get("/jobs/nope");
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /job/:handle */

describe("PATCH /jobs/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/jobs/j1`)
      .send({ title: "j1-new" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        title: "j1-new",
        salary: 1,
        equity: "0.01",
        company_handle: "c1",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/j1`).send({ title: "j1-new" });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/nope`)
      .send({ title: "new nope" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on company_handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/j1`)
      .send({ company_handle: "c2" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/j1`)
      .send({ salary: "none" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:handle */

describe("DELETE /jobs/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/j1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "j1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/j1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for job title", async function () {
    const resp = await request(app)
      .delete(`/jobs/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
