import { readFile } from "fs/promises";
import Handlebars from "handlebars";
const templateCache = new Map();
const loadTemplate = async (templateName) => {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }
    const templatePath = new URL(`./templates/${templateName}.hbs`, import.meta.url);
    const templateSource = await readFile(templatePath, "utf8");
    const compiled = Handlebars.compile(templateSource);
    templateCache.set(templateName, compiled);
    return compiled;
};
export const renderEmailTemplate = async (templateName, data) => {
    const compiled = await loadTemplate(templateName);
    return compiled(data);
};
//# sourceMappingURL=templateRenderer.js.map