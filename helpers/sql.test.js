process.env.NODE_ENV = "test";

const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
  test("works on one item", function () {
    const result = sqlForPartialUpdate(
      {
        firstName: "Jenny",
      },
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      }
    );
    expect(result).toEqual({
      setCols: '"first_name"=$1',
      values: ["Jenny"],
    });
  });
});

describe("sqlForPartialUpdate", function () {
  test("works on two items", function () {
    const result = sqlForPartialUpdate(
      {
        firstName: "Jenny",
        age: 35,
      },
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      }
    );
    expect(result).toEqual({
      setCols: `"first_name"=$1, "age"=$2`,
      values: ["Jenny", 35],
    });
  });
});
