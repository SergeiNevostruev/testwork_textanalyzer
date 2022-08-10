import Joi from "joi";
import Hapi from "@hapi/hapi";
import testController from "../controllers/testController";

const testRoute: Hapi.ServerRoute[] = [
  {
    method: "GET",
    path: "/api/parse",
    options: {
      handler: testController.parse,
      description: "parse",
      notes: "parse",
      tags: ["api"],
      validate: {
        options: {
          allowUnknown: true,
        },
      },
    },
  },
  {
    method: "POST",
    path: "/api/parse",
    options: {
      plugins: {
        "hapi-swagger": {
          responses: {
            "200": {
              description: "A PDF file",
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      handler: testController.file,
      description: "parse",
      notes: "parse",
      tags: ["api"],
      validate: {
        options: {
          allowUnknown: true,
        },
        payload: Joi.object({
          url: Joi.array().items(Joi.string().uri()),
        }),
      },
      response: {
        options: {
          allowUnknown: true,
        },
      },
    },
  },
];

export default testRoute;
