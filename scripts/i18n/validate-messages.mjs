import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const messagesRoot = resolve(root, "packages/i18n/src/messages");
const sourceLocale = "en";
const requiredLocales = ["en", "ru"];

function flattenMessages(value, path = [], output = new Map()) {
  if (typeof value === "string") {
    output.set(path.join("."), value);
    return output;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Message at "${path.join(".")}" must be a string or object`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (!key.trim()) {
      throw new Error(`Message key at "${path.join(".")}" cannot be empty`);
    }
    flattenMessages(child, [...path, key], output);
  }

  return output;
}

function extractVariables(message) {
  const variables = new Set();
  const pattern = /\{([A-Za-z][A-Za-z0-9_]*)\s*(?:,|\})/g;

  for (const match of message.matchAll(pattern)) {
    variables.add(match[1]);
  }

  return [...variables].sort();
}

async function readCatalog(locale, namespace) {
  const filePath = resolve(messagesRoot, locale, namespace);
  const source = await readFile(filePath, "utf8");
  const parsed = JSON.parse(source);
  return flattenMessages(parsed);
}

async function listNamespaces(locale) {
  return (await readdir(resolve(messagesRoot, locale)))
    .filter((file) => file.endsWith(".json"))
    .sort();
}

function compareSets(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  const errors = [];

  if (missing.length > 0) errors.push(`${label} is missing: ${missing.join(", ")}`);
  if (extra.length > 0) errors.push(`${label} has source-unknown entries: ${extra.join(", ")}`);

  return errors;
}

const errors = [];
const sourceNamespaces = await listNamespaces(sourceLocale);

for (const locale of requiredLocales) {
  const localeNamespaces = await listNamespaces(locale);
  errors.push(
    ...compareSets(localeNamespaces, sourceNamespaces, `Locale "${locale}" namespaces`),
  );

  for (const namespace of sourceNamespaces) {
    if (!localeNamespaces.includes(namespace)) continue;

    const sourceMessages = await readCatalog(sourceLocale, namespace);
    const translatedMessages = await readCatalog(locale, namespace);
    const sourceKeys = [...sourceMessages.keys()].sort();
    const translatedKeys = [...translatedMessages.keys()].sort();

    errors.push(
      ...compareSets(
        translatedKeys,
        sourceKeys,
        `Locale "${locale}" namespace "${namespace}"`,
      ),
    );

    for (const key of sourceKeys) {
      const sourceMessage = sourceMessages.get(key);
      const translatedMessage = translatedMessages.get(key);

      if (typeof translatedMessage !== "string") continue;
      if (!sourceMessage.trim()) {
        errors.push(`English source message "${namespace}.${key}" cannot be empty`);
      }
      if (!translatedMessage.trim()) {
        errors.push(`Message "${locale}:${namespace}.${key}" cannot be empty`);
      }

      const sourceVariables = extractVariables(sourceMessage);
      const translatedVariables = extractVariables(translatedMessage);
      if (sourceVariables.join("\0") !== translatedVariables.join("\0")) {
        errors.push(
          `ICU variables differ for "${locale}:${namespace}.${key}": ` +
            `expected [${sourceVariables.join(", ")}], received [${translatedVariables.join(", ")}]`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`i18n validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `i18n validation passed for ${requiredLocales.length} locales and ${sourceNamespaces.length} namespaces.`,
  );
}
