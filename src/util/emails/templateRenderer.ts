import { readFile } from "fs/promises";
import Handlebars from "handlebars";

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

const loadTemplate = async (templateName: string) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = new URL(
    `../../../mail-template/${templateName}.hbs`,
    import.meta.url,
  );
  const templateSource = await readFile(templatePath, "utf8");
  const compiled = Handlebars.compile(templateSource);
  templateCache.set(templateName, compiled);
  return compiled;
};

export const renderEmailTemplate = async (
  templateName: string,
  data: Record<string, unknown>,
) => {
  const compiled = await loadTemplate(templateName);
  return compiled(data);
};
