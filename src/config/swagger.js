import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Equipment Rental API",
            version: "1.0.0",
            description: "API documentation for the Equipment Rental backend service",
        },
        servers: [{ url: `http://localhost:${process.env.PORT ?? 3000}` }],
        components: {
            securitySchemes: {
                AuthorizationAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "Authorization",
                    description: "Paste your token here (or Bearer <token>). The server reads it from the Authorization header.",
                },
            },
        },
        security: [
            {
                AuthorizationAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/index.ts"],
};
const swaggerSpec = swaggerJsdoc(options);
export const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get("/api-docs.json", (_req, res) => {
        res.json(swaggerSpec);
    });
};
//# sourceMappingURL=swagger.js.map